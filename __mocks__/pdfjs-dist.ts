/**
 * pdf.js ships as ESM and only runs in a real browser, so tests get this stub.
 * Components that render a PDF are covered through their own logic helpers.
 */
export const GlobalWorkerOptions = { workerSrc: '' };

export function getDocument() {
	return {
		promise: Promise.resolve({
			numPages: 1,
			getPage: () =>
				Promise.resolve({
					getViewport: () => ({ width: 600, height: 800 }),
					render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
				}),
		}),
		destroy: () => Promise.resolve(),
	};
}
