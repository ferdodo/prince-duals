import { createWsClientConnection } from "./create-ws-client-connection";
import { createRtcConnection } from "./create-rtc-connection";
import { createSignalingSocket } from "./create-signaling-socket";
import type { Context } from "core/types";
import { createConfigStorage, Character, mountApp, initSignaling } from "core";

const configStorage = createConfigStorage({
	webProtocol: "http",
	webDomain: "localhost",
	webPort: 3366,
	wsProtocol: "ws",
	wsPort: 3377,
	offlineMode: true,
	supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
	supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
	offlineModeCharacter: Character.None
});

initSignaling(createSignalingSocket(configStorage.read()));

const context: Context = {
	configStorage,
	createRtcConnection,
	createWsClientConnection
};

mountApp(document.body, context);