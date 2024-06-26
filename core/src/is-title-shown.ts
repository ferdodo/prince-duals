import type { Game } from "core/types";
import { GameState, Character } from "core";

export function isTitleShown(myCharacter: Character | null, game: Game | null): boolean {
	if (game == null) {
		return true;
	}

	if (myCharacter == null) {
		return true;
	}

	switch (game.state) {
		case GameState.WaitingPlayerA:
		case GameState.PlayerADisconnected:
		case GameState.PlayerBDisconnected:
			return true;
		case GameState.WaitingPlayerB:
			return myCharacter !== Character.PlayerA;
		default:
			return false;
	}
}
