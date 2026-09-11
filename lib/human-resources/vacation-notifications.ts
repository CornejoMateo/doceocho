type VacationNotifyEvent = 'created' | 'resolved';

/**
 * Fires the push notification for a vacation request.
 * The endpoint re-checks who is allowed to trigger each event, and the request
 * is already saved by the time this runs, so a failure is logged instead of
 * surfaced: losing the push must not look like a failed request.
 */
export async function notifyVacationEvent(
	requestId: number,
	event: VacationNotifyEvent
): Promise<void> {
	try {
		await fetch('/api/vacations/notify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ requestId, event }),
		});
	} catch (error) {
		console.error('[vacations] Failed to send push notification:', error);
	}
}
