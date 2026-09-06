import type { Context, Message } from "core/types";
import type { Connection } from "connection-types";
import { createGameStorage, initiateBackendHandlers, Character } from "core";

export async function createClientConnection(context: Context): Promise<Connection<Message>> {
	const config = context.configStorage.read();

	if (config.offlineMode) {
		context.offlineModeGameStorage = createGameStorage();

		const [
			createConnection,
			serverConnection$
		] = await context.createRtcConnection(context.configStorage, Character.PlayerA);

		initiateBackendHandlers(context.offlineModeGameStorage, serverConnection$);
		return createConnection();
	}

	return context.createWsClientConnection(
		config.wsProtocol,
		config.wsPort,
		config.webDomain
	);
}
