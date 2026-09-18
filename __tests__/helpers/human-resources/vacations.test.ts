import {
	countPendingRequests,
	countVacationDays,
	findOverlappingApproved,
	sortVacationRequests,
} from '@/helpers/human-resources/vacations';
import { VacationRequest } from '@/lib/human-resources/vacation-requests';
import { VacationStatus } from '@/constants/human-resources/vacations';

function makeRequest(
	id: number,
	startDate: string,
	endDate: string,
	status: VacationStatus = 'Pendiente'
): VacationRequest {
	return {
		id,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		user_id: `user-${id}`,
		start_date: startDate,
		end_date: endDate,
		reason: null,
		status,
		reviewer_notes: null,
		reviewed_by: null,
		reviewed_at: null,
	};
}

describe('helpers/human-resources/vacations', () => {
	describe('countVacationDays', () => {
		test('counts both ends of the range', () => {
			expect(countVacationDays('2026-03-02', '2026-03-06')).toBe(5);
			expect(countVacationDays('2026-03-02', '2026-03-02')).toBe(1);
		});

		test('counts across a month boundary', () => {
			expect(countVacationDays('2026-01-30', '2026-02-02')).toBe(4);
		});

		test('is not shifted by daylight saving changes', () => {
			expect(countVacationDays('2026-10-31', '2026-11-02')).toBe(3);
		});

		test('returns 0 for an inverted or invalid range', () => {
			expect(countVacationDays('2026-03-06', '2026-03-02')).toBe(0);
			expect(countVacationDays('', '2026-03-02')).toBe(0);
		});
	});

	describe('sortVacationRequests', () => {
		test('puts pending first, then the most recent start date', () => {
			const requests = [
				makeRequest(1, '2026-01-05', '2026-01-10', 'Aprobada'),
				makeRequest(2, '2026-02-01', '2026-02-05'),
				makeRequest(3, '2026-03-01', '2026-03-05', 'Rechazada'),
				makeRequest(4, '2026-04-01', '2026-04-05'),
			];

			expect(sortVacationRequests(requests).map((request) => request.id)).toEqual([4, 2, 1, 3]);
		});

		test('does not mutate the original array', () => {
			const requests = [
				makeRequest(1, '2026-01-05', '2026-01-10', 'Aprobada'),
				makeRequest(2, '2026-02-01', '2026-02-05'),
			];
			const originalOrder = requests.map((request) => request.id);

			sortVacationRequests(requests);

			expect(requests.map((request) => request.id)).toEqual(originalOrder);
		});
	});

	describe('countPendingRequests', () => {
		test('counts only pending ones', () => {
			const requests = [
				makeRequest(1, '2026-01-05', '2026-01-10'),
				makeRequest(2, '2026-02-01', '2026-02-05', 'Aprobada'),
				makeRequest(3, '2026-03-01', '2026-03-05'),
			];

			expect(countPendingRequests(requests)).toBe(2);
		});
	});

	describe('findOverlappingApproved', () => {
		const requests = [
			makeRequest(1, '2026-01-05', '2026-01-15', 'Aprobada'),
			makeRequest(2, '2026-02-01', '2026-02-10', 'Aprobada'),
			makeRequest(3, '2026-01-08', '2026-01-12'),
			makeRequest(4, '2026-01-01', '2026-01-20', 'Rechazada'),
		];

		test('finds approved requests that share days', () => {
			const overlapping = findOverlappingApproved(requests, '2026-01-10', '2026-01-20');

			expect(overlapping.map((request) => request.id)).toEqual([1]);
		});

		test('ignores pending and rejected requests', () => {
			const overlapping = findOverlappingApproved(requests, '2026-01-08', '2026-01-12');

			expect(overlapping.every((request) => request.status === 'Aprobada')).toBe(true);
		});

		test('treats touching edges as an overlap', () => {
			expect(findOverlappingApproved(requests, '2026-01-15', '2026-01-25')).toHaveLength(1);
			expect(findOverlappingApproved(requests, '2026-01-16', '2026-01-25')).toHaveLength(0);
		});

		test('excludes the request being reviewed', () => {
			const overlapping = findOverlappingApproved(requests, '2026-01-05', '2026-01-15', 1);

			expect(overlapping).toHaveLength(0);
		});
	});
});
