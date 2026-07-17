import '@testing-library/jest-dom';

// Skip browser-only setup in node environment (API route tests)
if (typeof window !== 'undefined') {
	const localStorageMock = (() => {
		let store: Record<string, string> = {};
		return {
			getItem: (key: string) => store[key] || null,
			setItem: (key: string, value: string) => {
				store[key] = value.toString();
			},
			clear: () => {
				store = {};
			},
			removeItem: (key: string) => {
				delete store[key];
			},
		};
	})();

	Object.defineProperty(window, 'localStorage', {
		value: localStorageMock,
	});

	// Radix UI Select relies on pointer capture APIs that are not implemented by jsdom.
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = () => false;
	}

	if (!Element.prototype.setPointerCapture) {
		Element.prototype.setPointerCapture = () => {};
	}

	if (!Element.prototype.releasePointerCapture) {
		Element.prototype.releasePointerCapture = () => {};
	}

	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
}

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// Silencia warnings de act() de React Testing Library (son ruido, no afectan resultados)
const originalError = console.error;
console.error = (...args) => {
	if (typeof args[0] === 'string' && args[0].includes('inside a test was not wrapped in act'))
		return;
	originalError.call(console, ...args);
};
