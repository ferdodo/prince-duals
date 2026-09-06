import type { SignalingSocket } from "core/types";
import { outcomingSignaling$, broadcastIncomingSignaling } from "core";

export function initSignaling(signalingSocket: SignalingSocket): void {
	outcomingSignaling$.subscribe(
		signalingEvent => signalingSocket.publish(signalingEvent)
	);

	signalingSocket.events$.subscribe(
		signalingEvent => broadcastIncomingSignaling([signalingEvent])
	);
}
