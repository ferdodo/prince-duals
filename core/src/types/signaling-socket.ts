import type { Observable } from "rxjs";
import type { SignalingEvent } from "core/types";

export interface SignalingSocket {
	events$: Observable<SignalingEvent>;
	publish: (event: SignalingEvent) => void;
	close: () => void;
}
