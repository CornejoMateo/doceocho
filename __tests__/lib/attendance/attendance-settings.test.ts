import {
	getAttendanceSettings,
	updateAttendanceSettings,
	type AttendanceSettings,
} from '@/lib/attendance/attendance-settings';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		upsert: jest.fn(() => chain),
		single: jest.fn(() => chain),
		maybeSingle: jest.fn(() => chain),
	};

	const supabase = {
		from: jest.fn(() => chain),
	};

	return { supabase, chain };
}

describe('attendance-settings lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getAttendanceSettings', () => {
		it('fetches attendance settings by id=1', async () => {
			const { supabase, chain } = createSupabaseMock();
			const settings: AttendanceSettings = {
				id: 1,
				square_meters: 100,
				tolerance_quantity_minutes: 10,
				default_check_in_time: '09:00',
				default_check_out_time: '18:00',
				price_hour: 1000,
				price_hour_overtime: 1500,
				target_latitude: -34.6,
				target_longitude: -58.4,
			};
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: settings, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceSettings();

			expect(supabase.from).toHaveBeenCalledWith('attendance_settings');
			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.eq).toHaveBeenCalledWith('id', 1);
			expect(result.data).toEqual(settings);
		});

		it('returns null when no settings found', async () => {
			const { supabase, chain } = createSupabaseMock();
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceSettings();

			expect(result.data).toBeNull();
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getAttendanceSettings();

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});

	describe('updateAttendanceSettings', () => {
		it('upserts settings with id=1 and returns updated data', async () => {
			const { supabase, chain } = createSupabaseMock();
			const input = { price_hour: 2000 };
			const updated: AttendanceSettings = {
				id: 1,
				...input,
				square_meters: null,
				tolerance_quantity_minutes: null,
				default_check_in_time: null,
				default_check_out_time: null,
				price_hour_overtime: null,
				target_latitude: null,
				target_longitude: null,
			};
			chain.single = jest.fn().mockResolvedValue({ data: updated, error: null });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateAttendanceSettings(input);

			expect(supabase.from).toHaveBeenCalledWith('attendance_settings');
			expect(chain.upsert).toHaveBeenCalledWith({ ...input, id: 1 });
			expect(result.data).toEqual(updated);
		});

		it('returns the error on failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			const error = { message: 'Failed' };
			chain.single = jest.fn().mockResolvedValue({ data: null, error });
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await updateAttendanceSettings({ price_hour: 2000 });

			expect(result.data).toBeNull();
			expect(result.error).toEqual(error);
		});
	});
});
