/**
 * Calculate distance in meters between two coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371000; // Radius of Earth in meters
	const dLat = toRadians(lat2 - lat1);
	const dLon = toRadians(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

/**
 * Check if a location is within a specific radius
 * @param currentLat Current latitude
 * @param currentLon Current longitude
 * @param targetLat Target latitude
 * @param targetLon Target longitude
 * @param radiusMeters Radius in meters
 * @returns true if within radius
 */
export function isWithinRadius(
	currentLat: number,
	currentLon: number,
	targetLat: number,
	targetLon: number,
	radiusMeters: number
): boolean {
	const distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
	return distance <= radiusMeters;
}
