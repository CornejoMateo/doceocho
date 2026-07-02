export const clearCache = () => {
	localStorage.clear();
	if ('caches' in window) {
		caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
	}
	location.reload();
};
