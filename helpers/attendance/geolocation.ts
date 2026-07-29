/**
 * Obtain current location
 * @returns Promise with coordinates { latitude, longitude }
 */
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Geolocalización no soportada'));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
				});
			},
			(error) => {
				// Provide helpful instructions for iOS users when permission is denied
				if (error.code === error.PERMISSION_DENIED) {
					const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
					if (isIOS) {
						reject(
							new Error(
								'Permiso de ubicación denegado. En iOS: Configuración > Tu App > Ubicación > Mientras usas la app'
							)
						);
						return;
					}
				}
				reject(error);
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 0,
			}
		);
	});
}
