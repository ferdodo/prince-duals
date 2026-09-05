import { createContext } from 'preact';
import type { Context } from 'core/types';

export const appContext = createContext<Context | null>(null);