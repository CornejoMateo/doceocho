export const clearCache = async () => {
	localStorage.clear();
	if ('caches' in window) {
		try {
			const keys = await caches.keys();
			await Promise.all(keys.map((key) => caches.delete(key)));
		} catch (error) {
			console.error('Failed to clear cache storage', error);
		}
	}
	location.reload();
};
