import {
	updateAttendanceEntry,
	deleteAttendanceEntry,
	createAdminAttendanceEntry,
	getEntriesByPeriod,
	getAttendanceStatus,
	getAttendanceEntriesForMonth,
	mapAttendanceEntries,
	getUserAttendanceEntriesForMonth,
	getAttendanceEntriesForDay,
	type AttendanceEntryWithDate,
} from '@/lib/attendance/attendance-entries';
import { getSupabaseClient } from '@/lib/supabase-client';
import { getLocalDate } from '@/utils/format-date';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/utils/format-date', () => ({
	getLocalDate: jest.fn((d?: string) => {
		if (d) return d.split('T')[0];
		return '2026-08-15';
	}),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		gte: jest.fn(() => chain),
		lte: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => chain),
		maybeSingle: jest.fn(() => chain),
	};

	const supabase = {
		from: jest.fn(() => chain),
	};

	return { supabase, chain };
}

describe('attendance-entries lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('updateAttendanceEntry', () => {
		it('updates an entry by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			const changes = { description: 'Updated' };
			chain.single = jest.fn().mockResolvedValue({ data: { id: 5, ...changes }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateAttendanceEntry(5, changes);

			expect(supabase.from).toHaveBeenCalledWith('attendance_entries');
			expect(chain.update).toHaveBeenCalledWith(changes);
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
			expect(result.data).toEqual({ id: 5, description: 'Updated' });
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateAttendanceEntry(5, { description: 'x' });

			expect(result.error).toEqual(error);
		});
	});

	describe('deleteAttendanceEntry', () => {
		it('deletes an entry by id', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.single = jest.fn().mockResolvedValue({ data: { id: 10 }, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteAttendanceEntry(10);

			expect(supabase.from).toHaveBeenCalledWith('attendance_entries');
			expect(chain.delete).toHaveBeenCalled();
			expect(chain.eq).toHaveBeenCalledWith('id', 10);
			expect(result.data).toEqual({ id: 10 });
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await deleteAttendanceEntry(10);

			expect(result.error).toEqual(error);
		});
	});

	describe('createAdminAttendanceEntry', () => {
		it('creates a new attendance record and entry when no attendance exists', async () => {
			const { supabase, chain } = createSupabaseMock();
			// First query: check attendance
			chain.maybeSingle = jest
				.fn()
				.mockResolvedValueOnce({ data: null, error: null })
				// insert attendance
				.mockResolvedValueOnce({ data: null, error: null });
			chain.single = jest
				.fn()
				// create attendance record
				.mockResolvedValueOnce({
					data: { id: 42, date: '2026-08-15', user_id: 'user-1' },
					error: null,
				})
				// create entry
				.mockResolvedValueOnce({
					data: {
						id: 100,
						attendance_id: 42,
						type: 'regular_in',
						entry_time: '2026-08-15T10:00:00Z',
						attendance: { date: '2026-08-15', user_id: 'user-1' },
					},
					error: null,
				});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createAdminAttendanceEntry(
				'user-1',
				'regular_in',
				'2026-08-15T10:00:00Z',
				'Test'
			);

			expect(result.data).toBeDefined();
			expect(result.data?.attendance_date).toBe('2026-08-15');
			expect(result.data?.user_id).toBe('user-1');
		});

		it('uses existing attendance record when it exists', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.maybeSingle = jest.fn().mockResolvedValueOnce({
				data: { id: 10, date: '2026-08-15', user_id: 'user-1' },
				error: null,
			});
			chain.single = jest.fn().mockResolvedValueOnce({
				data: {
					id: 200,
					attendance_id: 10,
					type: 'regular_out',
					entry_time: '2026-08-15T18:00:00Z',
					attendance: { date: '2026-08-15', user_id: 'user-1' },
				},
				error: null,
			});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createAdminAttendanceEntry(
				'user-1',
				'regular_out',
				'2026-08-15T18:00:00Z',
				null
			);

			expect(result.data?.user_id).toBe('user-1');
		});

		it('returns error when checking attendance fails', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createAdminAttendanceEntry(
				'user-1',
				'regular_in',
				'2026-08-15T10:00:00Z',
				null
			);

			expect(result.error).toEqual(error);
		});

		it('returns error when creating attendance record fails', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Insert failed' };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await createAdminAttendanceEntry(
				'user-1',
				'regular_in',
				'2026-08-15T10:00:00Z',
				null
			);

			expect(result.error).toEqual(error);
		});
	});

	describe('getEntriesByPeriod', () => {
		const entries: AttendanceEntryWithDate[] = [
			{
				id: 1,
				attendance_id: 1,
				type: 'regular_in',
				entry_time: '2026-08-15T10:00:00Z',
				latitude: 0,
				longitude: 0,
				description: null,
				attendance_date: '2026-08-15',
				user_id: 'user-1',
				user_name: 'Juan',
			},
			{
				id: 2,
				attendance_id: 2,
				type: 'regular_in',
				entry_time: '2026-08-16T10:00:00Z',
				latitude: 0,
				longitude: 0,
				description: null,
				attendance_date: '2026-08-16',
				user_id: 'user-1',
				user_name: 'Juan',
			},
			{
				id: 3,
				attendance_id: 3,
				type: 'regular_in',
				entry_time: '2026-07-01T10:00:00Z',
				latitude: 0,
				longitude: 0,
				description: null,
				attendance_date: '2026-07-01',
				user_id: 'user-1',
				user_name: 'Juan',
			},
		];

		it('filters entries for a specific day', () => {
			const result = getEntriesByPeriod(entries, 'day', '2026-08-15');
			expect(result).toHaveLength(1);
			expect(result[0].attendance_date).toBe('2026-08-15');
		});

		it('filters entries for a week', () => {
			const result = getEntriesByPeriod(entries, 'week', '2026-08-15');
			expect(result).toHaveLength(2);
		});

		it('filters entries for a month', () => {
			const result = getEntriesByPeriod(entries, 'month', '2026-08-15');
			expect(result).toHaveLength(2);
			expect(result.every((e) => e.attendance_date.startsWith('2026-08'))).toBe(true);
		});

		it('returns matching entries for unknown period type', () => {
			const result = getEntriesByPeriod(entries, 'day' as any, '2026-08-15');
			expect(result).toHaveLength(1);
		});
	});

	describe('getAttendanceStatus', () => {
		it('returns regularOpen=true when last regular entry is regular_in', async () => {
			const { supabase, chain } = createSupabaseMock();
			const data = [
				{
					type: 'regular_in',
					entry_time: '2026-08-15T09:00:00Z',
					description: null,
					attendance: { date: '2026-08-15', user_id: 'user-1' },
				},
			];
			chain.order = jest.fn().mockResolvedValue({ data, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceStatus('user-1');

			expect(result.data).toEqual({ regularOpen: true, overtimeOpen: false });
		});

		it('returns overtimeOpen=true when last overtime entry is overtime_in', async () => {
			const { supabase, chain } = createSupabaseMock();
			const data = [
				{
					type: 'overtime_in',
					entry_time: '2026-08-15T20:00:00Z',
					description: null,
					attendance: { date: '2026-08-15', user_id: 'user-1' },
				},
				{
					type: 'regular_out',
					entry_time: '2026-08-15T18:00:00Z',
					description: null,
					attendance: { date: '2026-08-15', user_id: 'user-1' },
				},
			];
			chain.order = jest.fn().mockResolvedValue({ data, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceStatus('user-1');

			expect(result.data).toEqual({ regularOpen: false, overtimeOpen: true });
		});

		it('returns both closed when last entries are outs', async () => {
			const { supabase, chain } = createSupabaseMock();
			const data = [
				{
					type: 'regular_out',
					entry_time: '2026-08-15T18:00:00Z',
					description: null,
					attendance: { date: '2026-08-15', user_id: 'user-1' },
				},
			];
			chain.order = jest.fn().mockResolvedValue({ data, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceStatus('user-1');

			expect(result.data).toEqual({ regularOpen: false, overtimeOpen: false });
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.order = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceStatus('user-1');

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});

	describe('getAttendanceEntriesForMonth', () => {
		it('fetches entries with attendance join filtered by year and month', async () => {
			const { supabase, chain } = createSupabaseMock();
			const data = [
				{
					id: 1,
					type: 'regular_in',
					entry_time: '2026-07-01T10:00:00Z',
					attendance: {
						date: '2026-07-01',
						user_id: 'user-1',
						users: { name: 'Juan', last_name: 'Pérez', username: 'jjuan' },
					},
				},
			];
			chain.lte = jest.fn().mockResolvedValue({ data, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceEntriesForMonth(2026, 6);

			expect(supabase.from).toHaveBeenCalledWith('attendance_entries');
			expect(result.data).toEqual(data);
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.lte = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceEntriesForMonth(2026, 6);

			expect(result.error).toEqual(error);
		});
	});

	describe('mapAttendanceEntries', () => {
		it('maps attendance entries with user_name from name and last_name', () => {
			const data = [
				{
					id: 1,
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
					attendance: {
						date: '2026-08-15',
						user_id: 'user-1',
						users: { name: 'Juan', last_name: 'Pérez', username: 'jjuan' },
					},
				},
			];

			const result = mapAttendanceEntries(data);

			expect(result).toHaveLength(1);
			expect(result[0].attendance_date).toBe('2026-08-15');
			expect(result[0].user_id).toBe('user-1');
			expect(result[0].user_name).toBe('Juan Pérez');
		});

		it('falls back to username when name is missing', () => {
			const data = [
				{
					id: 1,
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
					attendance: {
						date: '2026-08-15',
						user_id: 'user-1',
						users: { name: null, last_name: null, username: 'jjuan' },
					},
				},
			];

			const result = mapAttendanceEntries(data);

			expect(result[0].user_name).toBe('jjuan');
		});

		it('uses Desconocido when no user info', () => {
			const data = [
				{
					id: 1,
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
					attendance: { date: '2026-08-15', user_id: 'user-1', users: null },
				},
			];

			const result = mapAttendanceEntries(data);

			expect(result[0].user_name).toBe('Desconocido');
		});

		it('returns empty array for null/undefined input', () => {
			expect(mapAttendanceEntries(null as any)).toEqual([]);
			expect(mapAttendanceEntries(undefined as any)).toEqual([]);
		});

		it('sorts entries by entry_time descending', () => {
			const data = [
				{
					id: 1,
					type: 'regular_in',
					entry_time: '2026-08-15T08:00:00Z',
					attendance: { date: '2026-08-15', user_id: 'u1', users: null },
				},
				{
					id: 2,
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
					attendance: { date: '2026-08-15', user_id: 'u1', users: null },
				},
			];

			const result = mapAttendanceEntries(data);

			expect(result[0].entry_time > result[1].entry_time).toBe(true);
		});
	});

	describe('getUserAttendanceEntriesForMonth', () => {
		it('fetches entries for a specific user in a month', async () => {
			const { supabase, chain } = createSupabaseMock();
			const data = [
				{
					id: 1,
					type: 'regular_in',
					entry_time: '2026-08-10T10:00:00Z',
					attendance: { date: '2026-08-10', user_id: 'user-1' },
				},
			];
			chain.lte = jest.fn().mockResolvedValue({ data, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getUserAttendanceEntriesForMonth('user-1', 2026, 7);

			expect(chain.eq).toHaveBeenCalledWith('attendance.user_id', 'user-1');
			expect(result.data).toHaveLength(1);
			expect(result.data?.[0].user_name).toBeDefined();
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.lte = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getUserAttendanceEntriesForMonth('user-1', 2026, 7);

			expect(result.error).toEqual(error);
		});
	});

	describe('getAttendanceEntriesForDay', () => {
		it('fetches entries for a specific date with user info', async () => {
			const { supabase, chain } = createSupabaseMock();
			const data = [
				{
					id: 1,
					type: 'regular_in',
					entry_time: '2026-08-15T10:00:00Z',
					attendance: {
						date: '2026-08-15',
						user_id: 'user-1',
						users: { name: 'Juan', last_name: 'Pérez', username: 'jjuan' },
					},
				},
			];
			chain.order = jest.fn().mockResolvedValue({ data, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceEntriesForDay('2026-08-15');

			expect(chain.eq).toHaveBeenCalledWith('attendance.date', '2026-08-15');
			expect(result.data).toHaveLength(1);
			expect(result.data?.[0].user_name).toBe('Juan Pérez');
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.order = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceEntriesForDay('2026-08-15');

			expect(result.error).toEqual(error);
		});
	});
});
