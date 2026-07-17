'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
	useEffect(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/sw.js')
				.then((registration) => {})
				.catch((error) => {
					if (process.env.NODE_ENV === 'development') {
						console.error('Service worker registration failed', error);
					}
				});
		}
	}, []);

	return null;
}
