import {
	getUserAttendanceHistory,
	calculateHoursWorked,
	hasMatchingPair,
	getUserAttendanceSummaries,
} from '@/lib/attendance/attendance';
import { AttendanceEntryWithDate } from '@/lib/attendance/attendance-entries';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/attendance/attendance-settings', () => ({
	getAttendanceSettings: jest.fn().mockResolvedValue({
		data: { price_hour: 1000, price_hour_overtime: 1500 },
		error: null,
	}),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
	};

	const supabase = {
		from: jest.fn(() => chain),
	};

	return { supabase, chain };
}

function makeEntry(overrides: Partial<AttendanceEntryWithDate> = {}): AttendanceEntryWithDate {
	return {
		id: 1,
		attendance_id: 1,
		type: 'regular_in',
		entry_time: '2026-08-15T10:00:00Z',
		latitude: 0,
		longitude: 0,
		description: null,
		attendance_date: '2026-08-15',
		user_id: 'user-1',
		user_name: 'Juan Pérez',
		...overrides,
	};
}

describe('attendance lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getUserAttendanceHistory', () => {
		it('fetches entries with attendance join for a user', async () => {
			const { supabase, chain } = createSupabaseMock();
			const data = [
				{
					id: 1,
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
					attendance: { date: '2026-08-15', user_id: 'user-1' },
				},
			];
			chain.order = jest.fn().mockResolvedValue({ data, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getUserAttendanceHistory('user-1');

			expect(supabase.from).toHaveBeenCalledWith('attendance_entries');
			expect(chain.eq).toHaveBeenCalledWith('attendance.user_id', 'user-1');
			expect(result.data).toHaveLength(1);
			expect(result.data?.[0].attendance_date).toBe('2026-08-15');
			expect(result.data?.[0].user_id).toBe('user-1');
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.order = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getUserAttendanceHistory('user-1');

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});

	describe('calculateHoursWorked', () => {
		it('returns 0 for empty entries', () => {
			expect(calculateHoursWorked([])).toBe(0);
		});

		it('calculates hours from a regular in/out pair', () => {
			const entries = [
				makeEntry({ id: 1, type: 'regular_in', entry_time: '2026-08-15T10:00:00Z' }),
				makeEntry({ id: 2, type: 'regular_out', entry_time: '2026-08-15T18:00:00Z' }),
			];

			expect(calculateHoursWorked(entries)).toBe(8);
		});

		it('calculates hours from an overtime in/out pair', () => {
			const entries = [
				makeEntry({ id: 1, type: 'overtime_in', entry_time: '2026-08-15T18:00:00Z' }),
				makeEntry({ id: 2, type: 'overtime_out', entry_time: '2026-08-15T20:00:00Z' }),
			];

			expect(calculateHoursWorked(entries)).toBe(2);
		});

		it('sums regular and overtime hours', () => {
			const entries = [
				makeEntry({ id: 1, type: 'regular_in', entry_time: '2026-08-15T10:00:00Z' }),
				makeEntry({ id: 2, type: 'regular_out', entry_time: '2026-08-15T18:00:00Z' }),
				makeEntry({ id: 3, type: 'overtime_in', entry_time: '2026-08-15T18:30:00Z' }),
				makeEntry({ id: 4, type: 'overtime_out', entry_time: '2026-08-15T20:30:00Z' }),
			];

			expect(calculateHoursWorked(entries)).toBe(10);
		});

		it('handles multiple days', () => {
			const entries = [
				makeEntry({
					id: 1,
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
					attendance_date: '2026-08-15',
				}),
				makeEntry({
					id: 2,
					type: 'regular_out',
					entry_time: '2026-08-15T18:00:00Z',
					attendance_date: '2026-08-15',
				}),
				makeEntry({
					id: 3,
					type: 'regular_in',
					entry_time: '2026-08-16T09:00:00Z',
					attendance_date: '2026-08-16',
				}),
				makeEntry({
					id: 4,
					type: 'regular_out',
					entry_time: '2026-08-16T17:00:00Z',
					attendance_date: '2026-08-16',
				}),
			];

			expect(calculateHoursWorked(entries)).toBe(16);
		});

		it('ignores unmatched outs', () => {
			const entries = [
				makeEntry({ id: 1, type: 'regular_out', entry_time: '2026-08-15T18:00:00Z' }),
			];

			expect(calculateHoursWorked(entries)).toBe(0);
		});

		it('handles unpaired in (no out) without counting', () => {
			const entries = [
				makeEntry({ id: 1, type: 'regular_in', entry_time: '2026-08-15T10:00:00Z' }),
			];

			expect(calculateHoursWorked(entries)).toBe(0);
		});
	});

	describe('hasMatchingPair', () => {
		it('returns true for a regular_in with a matching regular_out', () => {
			const entries = [
				makeEntry({ id: 1, type: 'regular_in', entry_time: '2026-08-15T10:00:00Z' }),
				makeEntry({ id: 2, type: 'regular_out', entry_time: '2026-08-15T18:00:00Z' }),
			];

			expect(hasMatchingPair(entries[0], entries)).toBe(true);
		});

		it('returns false for a regular_in without a matching out', () => {
			const entries = [
				makeEntry({ id: 1, type: 'regular_in', entry_time: '2026-08-15T10:00:00Z' }),
			];

			expect(hasMatchingPair(entries[0], entries)).toBe(false);
		});

		it('returns true for a regular_out with a pending regular_in', () => {
			const entries = [
				makeEntry({ id: 1, type: 'regular_in', entry_time: '2026-08-15T10:00:00Z' }),
				makeEntry({ id: 2, type: 'regular_out', entry_time: '2026-08-15T18:00:00Z' }),
			];

			expect(hasMatchingPair(entries[1], entries)).toBe(true);
		});

		it('returns false for a regular_out without a pending regular_in', () => {
			const entries = [
				makeEntry({ id: 1, type: 'regular_out', entry_time: '2026-08-15T18:00:00Z' }),
			];

			expect(hasMatchingPair(entries[0], entries)).toBe(false);
		});

		it('returns true for an overtime_in with a matching overtime_out', () => {
			const entries = [
				makeEntry({ id: 1, type: 'overtime_in', entry_time: '2026-08-15T18:00:00Z' }),
				makeEntry({ id: 2, type: 'overtime_out', entry_time: '2026-08-15T20:00:00Z' }),
			];

			expect(hasMatchingPair(entries[0], entries)).toBe(true);
		});

		it('returns false for an overtime_in without a matching out', () => {
			const entries = [
				makeEntry({ id: 1, type: 'overtime_in', entry_time: '2026-08-15T18:00:00Z' }),
			];

			expect(hasMatchingPair(entries[0], entries)).toBe(false);
		});
	});

	describe('getUserAttendanceSummaries', () => {
		it('returns empty array for empty entries', () => {
			expect(getUserAttendanceSummaries([])).toEqual([]);
		});

		it('groups entries by user and calculates total hours', () => {
			const entries = [
				makeEntry({
					id: 1,
					user_id: 'u1',
					user_name: 'Juan',
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
				}),
				makeEntry({
					id: 2,
					user_id: 'u1',
					user_name: 'Juan',
					type: 'regular_out',
					entry_time: '2026-08-15T18:00:00Z',
				}),
			];

			const result = getUserAttendanceSummaries(entries);

			expect(result).toHaveLength(1);
			expect(result[0].user_id).toBe('u1');
			expect(result[0].user_name).toBe('Juan');
			expect(result[0].total_hours).toBe(8);
			expect(result[0].entries).toHaveLength(2);
		});

		it('groups multiple users separately', () => {
			const entries = [
				makeEntry({
					id: 1,
					user_id: 'u1',
					user_name: 'Juan',
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
				}),
				makeEntry({
					id: 2,
					user_id: 'u1',
					user_name: 'Juan',
					type: 'regular_out',
					entry_time: '2026-08-15T18:00:00Z',
				}),
				makeEntry({
					id: 3,
					user_id: 'u2',
					user_name: 'Ana',
					type: 'regular_in',
					entry_time: '2026-08-15T09:00:00Z',
				}),
				makeEntry({
					id: 4,
					user_id: 'u2',
					user_name: 'Ana',
					type: 'regular_out',
					entry_time: '2026-08-15T17:00:00Z',
				}),
			];

			const result = getUserAttendanceSummaries(entries);

			expect(result).toHaveLength(2);
			expect(result.find((s) => s.user_id === 'u1')?.total_hours).toBe(8);
			expect(result.find((s) => s.user_id === 'u2')?.total_hours).toBe(8);
		});

		it('uses Desconocido when user_name is missing', () => {
			const entries = [
				makeEntry({
					id: 1,
					user_id: 'u1',
					user_name: undefined,
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
				}),
			];

			const result = getUserAttendanceSummaries(entries);

			expect(result[0].user_name).toBe('Desconocido');
		});
	});
});
