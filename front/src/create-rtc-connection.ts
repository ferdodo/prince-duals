import { Connection } from "connection-types";
import { Observable, Subject, share, filter, firstValueFrom } from "rxjs";
import type { ConfigStorage, SignalingEvent } from "core/types";
import { broadcastOutcomingSignaling, incomingSignaling$, Character } from "core";

// Décalage aléatoire avant de se déclarer joueur A : si les deux navigateurs
// démarrent ensemble, il évite qu'ils émettent leur offre dans le même instant.
const MAX_START_DELAY = 1000;

// Silence au bout duquel le joueur A considère que personne ne lui répondra.
const ROLE_TIMEOUT = 3000;

export async function createRtcConnection<T>(
	configStorage: ConfigStorage,
	role: Character
): Promise<[() => Connection<T>, Observable<Connection<T>>]> {
	const broadcastToServer$ = new Subject<T>();
	const broadcastToCurrentTabFromServer$ = new Subject<T>();
	const broadcastToWebRTC$ = new Subject<T>();
	const broadcastFromWebRTC$ = new Subject<T>();
	const _offlineServer$ = new Subject<Connection<T>>();
	let waitServerPrepare = new Promise(r => setTimeout(r, 150));
	let _connected$ = new Subject<void>();
	let tabIsServer = false;
	let acceptedAnswer = false;

	const currentTabServerConnection: Connection<T> = {
		id: 1,
		messages$: broadcastToServer$.asObservable(),
		send(message: T) {
			broadcastToCurrentTabFromServer$.next(message);
		}
	};

	const peerServerConnection: Connection<T> = {
		id: 2,
		messages$: broadcastFromWebRTC$.asObservable(),
		send(message: T) {
			broadcastToWebRTC$.next(message);
		}
	};

	let config = configStorage.read();

	const peerConnection: RTCPeerConnection = new RTCPeerConnection(config.stunServer && {
		iceServers: [{ urls: config.stunServer }]
	});

	configStorage.watch()
		.subscribe(function(c) {
			config = c;

			peerConnection.setConfiguration(c.stunServer && {
				iceServers: [{ urls: c.stunServer }]
			});
		});

	peerConnection.onicecandidate = function(e: RTCPeerConnectionIceEvent) {
		const candidate = e?.candidate?.toJSON();

		if (candidate) {
			broadcastOutcomingSignaling({ candidate });
		}
	};

	const signalingSubscription = incomingSignaling$
		.subscribe({
			async next(signalingEvents: SignalingEvent[]) {
				for (const signalingEvent of signalingEvents) {
					if (signalingEvent.offer) {
						await peerConnection.setRemoteDescription(signalingEvent.offer);
					}
	
					if (signalingEvent.answer) {
						await peerConnection.setRemoteDescription(signalingEvent.answer);
						acceptedAnswer = true;
					}
				}

				for (const signalingEvent of signalingEvents) {
					if (signalingEvent.candidate) {
						await peerConnection.addIceCandidate(signalingEvent.candidate);
					}

					if (signalingEvent.offer) {
						const answer = await peerConnection.createAnswer()
						await peerConnection.setLocalDescription(answer);
						broadcastOutcomingSignaling({ answer });
					}
				}


			},
			error(error) {
				console.error(error);
			}
		});

	async function sendOffers() {
		const offer = await peerConnection.createOffer();
		await peerConnection.setLocalDescription(offer);
		broadcastOutcomingSignaling({ offer });
	}

	peerConnection.ondatachannel = function receiveChannelCallback(event: RTCDataChannelEvent) {
		event.channel.onmessage = function(event: MessageEvent<string>) {
			const message: T = JSON.parse(event.data);
			broadcastFromWebRTC$.next(message);
		}
	};

	peerConnection.addEventListener("connectionstatechange", function() {	
		switch(peerConnection.connectionState) {
			case "connecting":
				break;
			case "connected":
				_connected$.next();
				waitServerPrepare = new Promise(r => setTimeout(r, 200));
				tabIsServer = acceptedAnswer;
			
				if (tabIsServer) {
					waitServerPrepare.then(() => {
						_offlineServer$.next(currentTabServerConnection);
						_offlineServer$.next(peerServerConnection);
					});
				}
			
				break;
			case "closed":
			case "disconnected":
			case "failed":
				signalingSubscription.unsubscribe();
				_offlineServer$.complete();
				break;
			default:
				throw new Error("Unhandled state change !");
		}
	});

	const sendChannel = peerConnection.createDataChannel('sendDataChannel');

	async function sendWhenConnected(m: T) {
		while (peerConnection.connectionState !== "connected") {
			await new Promise(r => setTimeout(r, 50));
		}

		await waitServerPrepare;
		sendChannel.send(JSON.stringify(m));
	}

	async function sendWhenConnectedInternal(m: T) {
		while (peerConnection.connectionState !== "connected") {
			await new Promise(r => setTimeout(r, 50));
		}

		await waitServerPrepare;
		broadcastToServer$.next(m);
	}

	const subscriptionToSendToWebRTC = broadcastToWebRTC$.subscribe({
		next: sendWhenConnected,
		error(error) {
			console.error(error);
		}
	});

    function createClientConnection(): Connection<T> {
        return {
            id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
            messages$: new Observable<T>(function(subscriber) {
    
                const connMessagesSub1 = broadcastToCurrentTabFromServer$
                    .pipe(filter(() => tabIsServer))
                    .subscribe({
                        next(message) {
                            subscriber.next(message);
                        },
                        error(error) {
                            console.error(error);
                        }
                    });
    
    
                const connMessagesSub2 = broadcastFromWebRTC$
                    .pipe(filter(() => !tabIsServer))
                    .subscribe({
                        next(message) {
                            subscriber.next(message);
                        },
                        error(error) {
                            console.error(error);
                        }
                    });
    
                peerConnection.addEventListener("connectionstatechange", function() {
                    switch(peerConnection.connectionState) {
                        case "connected":
						case "connecting":
                            break;
                        case "closed":
                        case "disconnected":
                        case "failed":
                            connMessagesSub1.unsubscribe();
                            connMessagesSub2.unsubscribe();
                            subscriptionToSendToWebRTC.unsubscribe();
                            subscriber.complete();
                            break;
                        default:
                            throw new Error("Unhandled state !");
                    }
    
                });
            })
                .pipe(share()),
            send(message: T) {
                if (tabIsServer) {
					sendWhenConnectedInternal(message)
						.catch(console.error);
                } else {
                    sendWhenConnected(message)
                        .catch(console.error);
                }
            }
        }
    }

	if (role === Character.PlayerA) {
		await new Promise(r => setTimeout(r, Math.random() * MAX_START_DELAY));
		sendOffers().catch(console.error);

		const connected = await Promise.race([
			firstValueFrom(_connected$).then(() => true),
			new Promise<boolean>(r => setTimeout(() => r(false), ROLE_TIMEOUT))
		]);

		if (!connected) {
			// Personne n'a répondu à notre offre. Cette connexion porte déjà une
			// description locale, elle ne peut plus accepter d'offre entrante :
			// on la démonte et on repart en joueur B.
			signalingSubscription.unsubscribe();
			subscriptionToSendToWebRTC.unsubscribe();
			peerConnection.close();
			return createRtcConnection<T>(configStorage, Character.PlayerB);
		}
	} else {
		await firstValueFrom(_connected$);
	}

	return <[() => Connection<T>, Observable<Connection<T>>]> [
		createClientConnection,
		_offlineServer$.asObservable()
	];
}
