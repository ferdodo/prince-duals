import { useContext } from 'preact/hooks';
import type { Context } from 'core/types';
import { appContext } from './app-context';

export function useAppContext(): Context {
	const context = useContext(appContext);
	if (!context) {
		throw new Error('useAppContext must be used inside a Provider');
	}
	return context;
}
