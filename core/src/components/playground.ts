import type { Connection } from "connection-types";
import { Subject, merge, combineLatest, from, mergeMap } from "rxjs";
import type { Message, Game } from "core/types";

import {
	computeIndication,
	observeGame,
	Character,
	observeMyCharacter,
	getGame,
	getMyCharacter,
	interact,
	isTitleShown,
	GameState,
	useAppContext,
	createClientConnection
} from "core";

import { html } from "htm/preact";
import { useEffect, useState, useMemo } from "preact/hooks";

export function Playground({ dataTestid }: { dataTestid: string }) {
	const context = useAppContext();

	const waitConnection: Promise<Connection<Message>> = useMemo(
		() => createClientConnection(context),
		[context]
	);

	const [myCharacter, setMyCharacter] = useState<Character | null>(null);
	const [game, setGame] = useState<Game | null>(null);
	const [disconnected, setDisconnected] = useState(false);
	const showTitle = useMemo(() => isTitleShown(myCharacter, game), [myCharacter, game]);
	const aWins = useMemo(() => game !== null && (game.state === GameState.AWins || game.state === GameState.AWinsByFault), [game]);
	const bWins = useMemo(() => game !== null && (game.state === GameState.BWins || game.state === GameState.BWinsByFault), [game]);
	const indication = useMemo(() => computeIndication(myCharacter, game), [myCharacter, game]);

	const sub = useMemo(function() {
		return from(waitConnection)
			.pipe(
				mergeMap(function(connection) {
					return combineLatest(
						merge(
							from(getGame(connection)),
							observeGame(connection)
						),
						merge(
							from(getMyCharacter(connection)),
							observeMyCharacter(connection)
						)
					);
				})
			).subscribe(function([_game, _myCharacter]) {
				setGame(_game);
				setMyCharacter(_myCharacter);
			});
	}, [waitConnection]);

	const connexionSub = useMemo(function() {
		return from(waitConnection)
			.pipe(
				mergeMap(function(connection) {
					return connection.messages$;
				})
			)
			.subscribe({
				error: () => setDisconnected(true),
				complete: () => setDisconnected(true)
			});
	}, [waitConnection]);

	const interaction$ = useMemo(() => new Subject(), []);

	const controlsSub = useMemo(function() {
		return combineLatest(
			from(waitConnection),
			interaction$
		).subscribe(function([connection]) {
			interact(connection)
				.catch(console.error);
		});
	}, [waitConnection, interaction$]);

	useEffect(function() {
		return function() {
			sub?.unsubscribe();
			connexionSub?.unsubscribe();
			controlsSub?.unsubscribe();
		};
	}, [sub, connexionSub, controlsSub]);

	return html`
		<div
			class="main"
			data-testid=${dataTestid}
			onClick=${() => interaction$.next(undefined)}
			onKeyDown=${() => interaction$.next(undefined)}
		>
			${disconnected && html`<p class="disconnectedFromServer">Disconnected from server.</p>`}
			${!disconnected && !game && html`<p aria-label="waitConnection" class="disconnectedFromServer">Attente d'une connexion.</p>`}
			${showTitle && game && html`<div aria-label="title" class="title"></div>`}

			${ !showTitle && html`
				<div aria-label="arena" class="arena">
					<div aria-label="player" class="vue-player">
						${game?.playerA && !aWins && !bWins && html`<div aria-label="playerA" class="playerA"></div>`}
						${game?.playerB && !aWins && !bWins && html`<div aria-label="playerB" class="playerB"></div>`}
						${game?.playerA && aWins && html`<div aria-label="playerAwins" class="playerAwins"></div>`}
						${game?.playerB && aWins && html`<div aria-label="playerBloses" class="playerBloses"></div>`}
						${game?.playerA && bWins && html`<div aria-label="playerAloses" class="playerAloses"></div>`}
						${game?.playerB && bWins && html`<div aria-label="playerBwins" class="playerBwins"></div>`}
					</div>

					${game?.state === GameState.Hajime && html`<p aria-label="exclamationPoints" class="exclamationPoints">!!</p>`}
					${myCharacter === Character.PlayerA && html`<p class="playerADisplay">Joueur 1</p>`}
					${myCharacter === Character.PlayerB && html`<p class="playerBDisplay">Joueur 2</p>`}
					${myCharacter === Character.None && html`<p class="spectatorDisplay">Spectateur</p>`}
					<p aria-label="indication" class="indication">${indication}</p>
				</div>
			`}
		</div>
	`;
}
