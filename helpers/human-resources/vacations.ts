import { VacationRequest } from '@/lib/human-resources/vacation-requests';
import { VacationStatus } from '@/constants/human-resources/vacations';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses a plain `date` column without letting the local timezone shift the day. */
export function parseDateOnly(value: string): Date {
	return new Date(`${value}T00:00:00`);
}

/** Days covered by the request, counting both ends. */
export function countVacationDays(startDate: string, endDate: string): number {
	const start = parseDateOnly(startDate);
	const end = parseDateOnly(endDate);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
	if (end < start) return 0;

	return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

const STATUS_ORDER: Record<VacationStatus, number> = {
	Pendiente: 0,
	Aprobada: 1,
	Rechazada: 2,
};

/** Pending first so admins see what needs a decision, then the most recent ones. */
export function sortVacationRequests(requests: VacationRequest[]): VacationRequest[] {
	return [...requests].sort((a, b) => {
		if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
			return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
		}

		return b.start_date.localeCompare(a.start_date);
	});
}

export function countPendingRequests(requests: VacationRequest[]): number {
	return requests.filter((request) => request.status === 'Pendiente').length;
}

/**
 * Approved requests that overlap the given range, ignoring `excludeRequestId`.
 * Used to warn an admin before approving two people at the same time.
 */
export function findOverlappingApproved(
	requests: VacationRequest[],
	startDate: string,
	endDate: string,
	excludeRequestId?: number
): VacationRequest[] {
	return requests.filter(
		(request) =>
			request.status === 'Aprobada' &&
			request.id !== excludeRequestId &&
			request.start_date <= endDate &&
			request.end_date >= startDate
	);
}
