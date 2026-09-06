import { Subject } from "rxjs";
import type { Config, SignalingEvent, SignalingSocket } from "core/types";

// Phoenix ferme les connexions inactives ; la doc Supabase demande un battement
// au moins toutes les 25 secondes.
const HEARTBEAT_INTERVAL = 20000;

const TOPIC = "realtime:prince-duals";
const SIGNALING_EVENT = "signaling";

export function createSignalingSocket(config: Config): SignalingSocket {
	const _events$: Subject<SignalingEvent> = new Subject();

	const socketUrl = `${ String(config.supabaseUrl).replace(/^http/, "ws") }/realtime/v1/websocket`
		+ `?apikey=${ encodeURIComponent(String(config.supabaseAnonKey)) }&vsn=1.0.0`;

	// La clé est un secret public, mais inutile de la déverser dans la console.
	console.log("[Signaling] connexion —", socketUrl.replace(/apikey=[^&]*/, "apikey=***"));

	const socket = new WebSocket(socketUrl);
	let ref = 0;

	function send(event: string, payload: unknown, topic = TOPIC) {
		if (socket.readyState !== WebSocket.OPEN) {
			console.warn("[Signaling] envoi IGNORÉ, socket non ouverte —", event);
			return;
		}

		ref++;
		const frame = { topic, event, payload, ref: String(ref) };
		console.log("[Signaling] →", frame);
		socket.send(JSON.stringify(frame));
	}

	socket.onopen = function() {
		console.log("[Signaling] socket ouverte, envoi du phx_join sur", TOPIC);
		// `self: false` : le serveur ne nous renvoie pas nos propres messages.
		send("phx_join", { config: { broadcast: { self: false } } });
	};

	socket.onmessage = function(message: MessageEvent<string>) {
		const frame = JSON.parse(message.data);

		// Tout est tracé, y compris les phx_reply : c'est là qu'apparaissent les
		// refus de jointure et les erreurs d'authentification.
		console.log("[Signaling] ←", frame);

		if (frame.event === "broadcast" && frame.payload?.event === SIGNALING_EVENT) {
			console.log("[Signaling] signalement reçu du pair —", frame.payload.payload);
			_events$.next(frame.payload.payload);
		}
	};

	socket.onerror = function(event) {
		console.error("[Signaling] erreur socket —", event);
	};

	socket.onclose = function(event) {
		console.warn(`[Signaling] socket fermée — code ${ event.code } ${ event.reason }`);
		_events$.complete();
	};

	const heartbeat = setInterval(() => send("heartbeat", {}, "phoenix"), HEARTBEAT_INTERVAL);

	return {
		events$: _events$.asObservable(),
		publish(signalingEvent: SignalingEvent) {
			console.log("[Signaling] publication du signalement local —", signalingEvent);
			send("broadcast", { type: "broadcast", event: SIGNALING_EVENT, payload: signalingEvent });
		},
		close() {
			console.log("[Signaling] fermeture demandée");
			clearInterval(heartbeat);
			socket.close();
		}
	};
}
