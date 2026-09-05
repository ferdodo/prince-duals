import { Subject, type Observable, NEVER } from "rxjs";
import type { Connection } from "connection-types";
import { uid } from "uid";
import type { Context, Message, ConfigStorage } from "core/types";
import { ConfigFactory, createBidirectionalConnectionMock, createConfigStorage } from "core";

let _rtcServerConnetion$: Subject<Connection<Message>> | null = null;

export class ContextFactory {
	rtcServer = false;
	_serverConnexion$: Subject<Connection<Message>>;
	serverConnexion$: Observable<Connection<Message>>;
	configStorage: ConfigStorage;
	context: Context;
	contextId: string = uid();

	constructor() {
		this._serverConnexion$ = new Subject();
		const configFactory = new ConfigFactory();
		this.configStorage = createConfigStorage(
			configFactory.build()
		);

		this.serverConnexion$ = this._serverConnexion$.asObservable();

		this.context = {
			configStorage: this.configStorage,
			createRtcConnection: (configStorage) => {
				const config = configStorage.read();

				if (!config.offlineMode) {
					throw new Error("Shall only create RTC connections in offline mode !");
				}

				if (!_rtcServerConnetion$) {
					this.rtcServer = true;
					_rtcServerConnetion$ = new Subject();
				}

				const rtcServerConnection = _rtcServerConnetion$;
				const createConnection = () => {
					const [clientConnection, serverConnection] = createBidirectionalConnectionMock();
					rtcServerConnection.next(serverConnection);
					return clientConnection;
				};

				const rtcServerConnextion$ = this.rtcServer
					? _rtcServerConnetion$.asObservable()
					: NEVER;

				return Promise.resolve([createConnection, rtcServerConnextion$]);
			},
			createWsClientConnection: () => {
				const config = this.configStorage.read();

				if (config.offlineMode) {
					throw new Error("Shall only create connection to server in online mode !");
				}

				const [clientConnection, serverConnection] = createBidirectionalConnectionMock();

				this._serverConnexion$.next(serverConnection);
				return clientConnection;
			}
		};
	}

	setOffline() {
		this.configStorage.save({ offlineMode: true });
	}

	build(): Context {
		return { ...this.context };
	}
}
