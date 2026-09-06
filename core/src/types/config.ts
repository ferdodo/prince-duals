import type { Character } from "core";

export interface Config {
	webProtocol: string;
	webDomain: string;
	webPort: number;
	wsProtocol: string;
	wsPort: number;
	offlineMode: boolean;
	stunServer?: string;
	supabaseUrl?: string;
	supabaseAnonKey?: string;
	offlineModeCharacter: Character;
}
