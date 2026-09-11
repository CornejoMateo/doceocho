import {
	createAttendanceEntry,
	createAttendance,
	getAttendanceByDate,
	getLastAttendanceEntry,
} from '@/lib/attendance/attendance-server';
import { getServerSupabaseClient } from '@/lib/get-server-supabase-client';

jest.mock('@/lib/get-server-supabase-client', () => ({
	getServerSupabaseClient: jest.fn(),
}));

jest.mock('@/utils/format-date', () => ({
	getLocalDate: jest.fn(() => '2026-08-15'),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		single: jest.fn(() => chain),
		maybeSingle: jest.fn(() => chain),
		order: jest.fn(() => chain),
		limit: jest.fn(() => chain),
		in: jest.fn(() => chain),
	};

	const supabase = {
		from: jest.fn(() => chain),
	};

	return { supabase, chain };
}

describe('attendance-server lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createAttendanceEntry', () => {
		it('inserts an entry and returns it', async () => {
			const { supabase, chain } = createSupabaseMock();
			const entry = {
				attendance_id: 1,
				type: 'regular_in',
				entry_time: '2026-08-15T10:00:00Z',
				latitude: 0,
				longitude: 0,
				description: null,
			};
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: { id: 1, ...entry }, error: null });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await createAttendanceEntry(entry);

			expect(supabase.from).toHaveBeenCalledWith('attendance_entries');
			expect(chain.insert).toHaveBeenCalledWith(entry);
			expect(result.data).toEqual({ id: 1, ...entry });
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await createAttendanceEntry({
				attendance_id: 1,
				type: 'regular_in',
				entry_time: '2026-08-15T10:00:00Z',
				latitude: 0,
				longitude: 0,
				description: null,
			});

			expect(result.error).toEqual(error);
		});
	});

	describe('createAttendance', () => {
		it('inserts an attendance record and returns it', async () => {
			const { supabase, chain } = createSupabaseMock();
			const attendance = { id: 1, date: '2026-08-15', user_id: 'user-1' };
			chain.single = jest.fn().mockResolvedValue({ data: attendance, error: null });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await createAttendance('2026-08-15', 'user-1');

			expect(supabase.from).toHaveBeenCalledWith('attendance');
			expect(chain.insert).toHaveBeenCalledWith({ date: '2026-08-15', user_id: 'user-1' });
			expect(result.data).toEqual(attendance);
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await createAttendance('2026-08-15', 'user-1');

			expect(result.error).toEqual(error);
		});
	});

	describe('getAttendanceByDate', () => {
		it('fetches attendance for a specific date and user', async () => {
			const { supabase, chain } = createSupabaseMock();
			const attendance = { id: 2, date: '2026-07-01', user_id: 'user-2' };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: attendance, error: null });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await getAttendanceByDate('2026-07-01', 'user-2');

			expect(supabase.from).toHaveBeenCalledWith('attendance');
			expect(chain.eq).toHaveBeenCalledWith('date', '2026-07-01');
			expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-2');
			expect(result.data).toEqual(attendance);
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await getAttendanceByDate('2026-07-01', 'user-2');

			expect(result.error).toEqual(error);
		});
	});

	describe('getLastAttendanceEntry', () => {
		it('fetches last regular entry when isOvertime is false', async () => {
			const { supabase, chain } = createSupabaseMock();
			const entry = {
				id: 10,
				attendance_id: 1,
				type: 'regular_out',
				entry_time: '2026-08-15T18:00:00Z',
			};
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: entry, error: null });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await getLastAttendanceEntry(1, false);

			expect(supabase.from).toHaveBeenCalledWith('attendance_entries');
			expect(chain.eq).toHaveBeenCalledWith('attendance_id', 1);
			expect(chain.in).toHaveBeenCalledWith('type', ['regular_in', 'regular_out']);
			expect(chain.order).toHaveBeenCalledWith('entry_time', { ascending: false });
			expect(chain.limit).toHaveBeenCalledWith(1);
			expect(result.data).toEqual(entry);
		});

		it('fetches last overtime entry when isOvertime is true', async () => {
			const { supabase, chain } = createSupabaseMock();
			const entry = {
				id: 11,
				attendance_id: 1,
				type: 'overtime_in',
				entry_time: '2026-08-15T18:30:00Z',
			};
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: entry, error: null });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await getLastAttendanceEntry(1, true);

			expect(chain.in).toHaveBeenCalledWith('type', ['overtime_in', 'overtime_out']);
			expect(result.data).toEqual(entry);
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error });
			(getServerSupabaseClient as jest.Mock).mockResolvedValue(supabase);

			const result = await getLastAttendanceEntry(1, false);

			expect(result.error).toEqual(error);
		});
	});
});
