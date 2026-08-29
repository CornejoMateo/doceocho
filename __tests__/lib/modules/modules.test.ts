import {
	listModules,
	listModulesForCurrentMonth,
	getModuleById,
	getModulesByWorkId,
	getModulesByUserId,
	getUserModulesForMonth,
	createModule,
	updateModule,
	deleteModule,
} from '@/lib/modules/modules';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/utils/format-date', () => ({
	...jest.requireActual('@/utils/format-date'),
	getLocalDate: jest.fn(),
}));

import { getLocalDate } from '@/utils/format-date';

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => chain),
		gte: jest.fn(() => chain),
		lte: jest.fn(() => chain),
	};

	const storageRemove = jest.fn();

	const supabase = {
		from: jest.fn(() => chain),
		storage: {
			from: jest.fn(() => ({ from: jest.fn(), upload: jest.fn(), remove: storageRemove })),
		},
	};

	return { supabase, chain, storageRemove };
}

const MODULE_ROW = {
	id: 1,
	created_at: '2026-08-28T12:00:00.000Z',
	user_id: 'user-1',
	status: 'not_send',
	title: 'Fundaciones',
	description: 'Módulo 1',
	work_id: 2,
	works: { name: 'Obra Centro', locality: 'Centro' },
};

describe('modules lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('listModules', () => {
		it('returns modules with the work name mapped', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: [MODULE_ROW], error: null }));

			const result = await listModules();

			expect(supabase.from).toHaveBeenCalledWith('modules');
			expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('works:work_id'));
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });

			expect(result.data).toEqual([{ ...MODULE_ROW, work_name: 'Obra Centro' }]);
			expect(result.error).toBeNull();
		});

		it('maps work_name to null when the module has no work', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(
				Promise.resolve({ data: [{ ...MODULE_ROW, works: null }], error: null })
			);

			const result = await listModules();

			expect(result.data?.[0].work_name).toBeNull();
		});

		it('returns error on supabase error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: null, error: new Error('DB error') }));

			const result = await listModules();

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});

		it('returns empty array when there are no modules', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: [], error: null }));

			const result = await listModules();

			expect(result.data).toEqual([]);
			expect(result.error).toBeNull();
		});
	});

	describe('listModulesForCurrentMonth', () => {
		it('filters by the current month in Argentina timezone', async () => {
			(getLocalDate as jest.Mock).mockReturnValue('2026-08-28');

			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: [MODULE_ROW], error: null }));

			const result = await listModulesForCurrentMonth();

			expect(chain.select).toHaveBeenCalledWith(expect.stringContaining('works:work_id'));
			expect(chain.gte).toHaveBeenCalledTimes(1);

			const start = (chain.gte as jest.Mock).mock.calls[0][1];
			const end = (chain.lte as jest.Mock).mock.calls[0][1];

			expect(start).toBe('2026-08-01T03:00:00.000Z');
			expect(end).toBe('2026-09-01T02:59:59.999Z');
			expect(new Date(start).getTime()).toBeLessThanOrEqual(new Date(end).getTime());
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });

			expect(result.data).toEqual([{ ...MODULE_ROW, work_name: 'Obra Centro' }]);
			expect(result.error).toBeNull();
		});

		it('returns error on supabase error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: null, error: new Error('DB error') }));

			const result = await listModulesForCurrentMonth();

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});
	});

	describe('getModuleById', () => {
		it('returns a module with its work name', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(Promise.resolve({ data: MODULE_ROW, error: null }));

			const result = await getModuleById(1);

			expect(chain.eq).toHaveBeenCalledWith('id', 1);
			expect(result.data?.work_name).toBe('Obra Centro');
			expect(result.error).toBeNull();
		});

		it('returns error when the module does not exist', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.single.mockReturnValue(Promise.resolve({ data: null, error: new Error('Not found') }));

			const result = await getModuleById(999);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Not found'));
		});
	});

	describe('getModulesByWorkId', () => {
		it('returns modules for a work', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: [MODULE_ROW], error: null }));

			const result = await getModulesByWorkId(2);

			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.eq).toHaveBeenCalledWith('work_id', 2);
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
			expect(result.data).toEqual([MODULE_ROW]);
			expect(result.error).toBeNull();
		});

		it('returns error on supabase error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: null, error: new Error('DB error') }));

			const result = await getModulesByWorkId(2);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});
	});

	describe('getModulesByUserId', () => {
		it('returns modules of a user with work name mapped', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(
				Promise.resolve({ data: [MODULE_ROW, { ...MODULE_ROW, id: 2, works: null }], error: null })
			);

			const result = await getModulesByUserId('user-1');

			expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
			expect(result.data?.[0].work_name).toBe('Obra Centro');
			expect(result.data?.[1].work_name).toBeNull();
			expect(result.error).toBeNull();
		});

		it('returns error on supabase error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: null, error: new Error('DB error') }));

			const result = await getModulesByUserId('user-1');

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});
	});

	describe('getUserModulesForMonth', () => {
		it('filters by user and period with Argentina timezone bounds', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(
				Promise.resolve({ data: [MODULE_ROW, { ...MODULE_ROW, id: 2, works: null }], error: null })
			);

			const result = await getUserModulesForMonth('user-1', 2026, 8);

			expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
			expect((chain.gte as jest.Mock).mock.calls[0][1]).toBe('2026-08-01T03:00:00.000Z');
			expect((chain.lte as jest.Mock).mock.calls[0][1]).toBe('2026-09-01T02:59:59.999Z');
			expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
			expect(result.data?.[0].work_name).toBe('Obra Centro');
			expect(result.data?.[1].work_name).toBeNull();
			expect(result.error).toBeNull();
		});

		it('returns error on supabase error', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.order.mockReturnValue(Promise.resolve({ data: null, error: new Error('DB error') }));

			const result = await getUserModulesForMonth('user-1', 2026, 8);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('DB error'));
		});
	});

	describe('createModule', () => {
		const payload = {
			user_id: 'user-1',
			status: 'not_send',
			title: 'Fundaciones',
			description: null,
			amount: null,
			work_id: 2,
		};

		it('creates a module using the default client', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(Promise.resolve({ data: MODULE_ROW, error: null }));

			const result = await createModule(payload);

			expect(supabase.from).toHaveBeenCalledWith('modules');
			expect(chain.insert).toHaveBeenCalledWith(payload);
			expect(chain.select).toHaveBeenCalled();
			expect(result.data).toEqual(MODULE_ROW);
			expect(result.error).toBeNull();
		});

		it('uses the provided client when given', async () => {
			const provided = createSupabaseMock();
			provided.chain.insert.mockReturnValue(provided.chain);
			provided.chain.select.mockReturnValue(provided.chain);
			provided.chain.single.mockReturnValue(Promise.resolve({ data: MODULE_ROW, error: null }));

			const result = await createModule(payload, provided.supabase as never);

			expect(provided.supabase.from).toHaveBeenCalledWith('modules');
			expect(getSupabaseClient).not.toHaveBeenCalled();
			expect(result.error).toBeNull();
		});

		it('returns error on insert failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.insert.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(
				Promise.resolve({ data: null, error: new Error('Insert failed') })
			);

			const result = await createModule(payload);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Insert failed'));
		});
	});

	describe('updateModule', () => {
		it('updates module fields', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const updated = { ...MODULE_ROW, title: 'Estructura' };
			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(Promise.resolve({ data: updated, error: null }));

			const result = await updateModule(1, { title: 'Estructura' });

			expect(chain.update).toHaveBeenCalledWith({ title: 'Estructura' });
			expect(chain.eq).toHaveBeenCalledWith('id', 1);
			expect(result.data?.title).toBe('Estructura');
			expect(result.error).toBeNull();
		});

		it('returns error on update failure', async () => {
			const { supabase, chain } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.update.mockReturnValue(chain);
			chain.eq.mockReturnValue(chain);
			chain.select.mockReturnValue(chain);
			chain.single.mockReturnValue(
				Promise.resolve({ data: null, error: new Error('Update failed') })
			);

			const result = await updateModule(1, { title: 'X' });

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Update failed'));
		});
	});

	describe('deleteModule', () => {
		it('deletes the module row (cascade) and then removes storage objects', async () => {
			const { supabase, chain, storageRemove } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(
				Promise.resolve({
					data: [{ storage_path: '5/a.jpg' }, { storage_path: '5/b.mp4' }],
					error: null,
				})
			);
			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce({ data: null, error: null });
			storageRemove.mockResolvedValue({ data: null, error: null });

			const result = await deleteModule(5);

			expect(supabase.from).toHaveBeenCalledWith('modules_files');
			expect(chain.select).toHaveBeenCalledWith('storage_path');
			expect(chain.eq).toHaveBeenCalledWith('module_id', 5);
			expect(supabase.from).toHaveBeenCalledWith('modules');
			expect(chain.delete).toHaveBeenCalled();
			expect(chain.eq).toHaveBeenCalledWith('id', 5);
			expect(supabase.storage.from).toHaveBeenCalledWith('modules');
			expect(storageRemove).toHaveBeenCalledWith(['5/a.jpg', '5/b.mp4']);
			expect(result.data).toBeNull();
			expect(result.error).toBeNull();
		});

		it('deletes the module row without storage cleanup when it has no files', async () => {
			const { supabase, chain, storageRemove } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(Promise.resolve({ data: [], error: null }));
			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce({ data: null, error: null });

			const result = await deleteModule(5);

			expect(supabase.storage.from).not.toHaveBeenCalled();
			expect(storageRemove).not.toHaveBeenCalled();
			expect(result.error).toBeNull();
		});

		it('returns error and stops when listing files fails', async () => {
			const { supabase, chain, storageRemove } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(
				Promise.resolve({ data: null, error: new Error('List failed') })
			);

			const result = await deleteModule(5);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('List failed'));
			expect(chain.delete).not.toHaveBeenCalled();
			expect(storageRemove).not.toHaveBeenCalled();
		});

		it('returns error and does not touch storage when the module delete fails', async () => {
			const { supabase, chain, storageRemove } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(
				Promise.resolve({ data: [{ storage_path: '5/a.jpg' }], error: null })
			);
			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce({ data: null, error: new Error('Delete failed') });

			const result = await deleteModule(5);

			expect(result.data).toBeNull();
			expect(result.error).toEqual(new Error('Delete failed'));
			expect(supabase.storage.from).not.toHaveBeenCalled();
			expect(storageRemove).not.toHaveBeenCalled();
		});

		it('still succeeds when storage cleanup fails (best-effort)', async () => {
			const { supabase, chain, storageRemove } = createSupabaseMock();
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			chain.select.mockReturnValue(chain);
			chain.eq.mockReturnValueOnce(
				Promise.resolve({ data: [{ storage_path: '5/a.jpg' }], error: null })
			);
			chain.delete.mockReturnValue(chain);
			chain.eq.mockResolvedValueOnce({ data: null, error: null });
			storageRemove.mockResolvedValue({ data: null, error: new Error('storage down') });

			const result = await deleteModule(5);

			expect(storageRemove).toHaveBeenCalledWith(['5/a.jpg']);
			expect(result.error).toBeNull();
		});
	});
});
