// Single entrypoint: ensure polyfill executes before app code
import './polyfills/react-global';

function isReactReady() {
	const w = (typeof window !== 'undefined' ? (window as unknown as { React?: any }) : {})
	const g = (typeof globalThis !== 'undefined' ? (globalThis as unknown as { React?: any }) : {})
	const R = w.React || g.React
	return !!(R && typeof R.createContext === 'function')
}

async function waitForReactReady(timeoutMs = 3000) {
	const start = Date.now()
	while (!isReactReady()) {
		if (Date.now() - start > timeoutMs) break
		await new Promise(r => setTimeout(r, 10))
	}
}

;(async () => {
	// Extra safety: ensure React is available globally before loading the app
	await waitForReactReady()
	await import('./main.tsx')
})()
