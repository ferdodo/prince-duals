import type { Connection } from "connection-types";
import type { Observable, Subscription } from "rxjs";
import type { Game, GameStorage, Message } from "core/types";
import { filter } from "rxjs";
import { GameState } from "core";

const {
	WaitingPlayerA,
	WaitingPlayerB,
	Matte,
	Hajime,
	AWins,
	BWins,
	AWinsByFault,
	BWinsByFault,
	PlayerADisconnected,
	PlayerBDisconnected
} = GameState;

let hajimeTimeout: ReturnType<typeof setTimeout>;

export function interactHandle(gameStorage: GameStorage, connexions$: Observable<Connection<Message>>): Subscription {
	return connexions$.subscribe(function(connection: Connection<Message>) {
		const messageSub = connection.messages$.pipe(filter(message => Boolean(message.interactEmit)))
			.subscribe({
				next() {
					const game: Game = gameStorage.read();

					switch (game.state) {
						case AWins:
						case BWins:
						case AWinsByFault:
						case BWinsByFault:
							game.state = WaitingPlayerA;
							game.playerA = undefined;
							game.playerB = undefined;
							break;
						case PlayerADisconnected:
						case PlayerBDisconnected:
						case WaitingPlayerA:
							game.playerA = connection.id;
							game.state = WaitingPlayerB;
							break;
						case WaitingPlayerB:
							if (game.playerA !== connection.id) {
								game.playerB = connection.id;
								game.state = Matte;

								hajimeTimeout = setTimeout(function() {
									game.state = Hajime;
									gameStorage.save(game);
								}, 2000 + Math.random() * 4000);
							} else {
								return;
							}

							break;
						case Matte:
							if (connection.id === game.playerA) {
								clearTimeout(hajimeTimeout);
								game.state = BWinsByFault;
							} else if (connection.id === game.playerB) {
								clearTimeout(hajimeTimeout);
								game.state = AWinsByFault;
							}

							break;
						case Hajime:
							if (connection.id === game.playerA) {
								game.state = AWins;
							} else if (connection.id === game.playerB) {
								game.state = BWins;
							}

							break;
						default:
							return;
					}

					gameStorage.save(game);
				},
				complete() {
					const game: Game = gameStorage.read();

					switch (connection.id) {
						case game.playerA:
							clearTimeout(hajimeTimeout);
							game.playerA = undefined;
							game.playerB = undefined;
							game.state = PlayerADisconnected;
							break;
						case game.playerB:
							clearTimeout(hajimeTimeout);
							game.playerA = undefined;
							game.playerB = undefined;
							game.state = PlayerBDisconnected;
							break;
						default:
							return;
					}

					gameStorage.save(game);
					messageSub.unsubscribe();
				}
			});
	});
}
