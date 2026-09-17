import { submitModuleReviewAction } from '@/lib/modules/modules-review-submit';
import { requireCurrentUserAdmin } from '@/lib/auth/require-admin';

jest.mock('@/lib/auth/require-admin', () => ({
	requireCurrentUserAdmin: jest.fn(),
}));

function createSupabaseMock() {
	const filesChain: Record<string, jest.Mock> = {
		select: jest.fn(() => filesChain),
		eq: jest.fn(),
	};

	const modulesChain: Record<string, jest.Mock> = {
		update: jest.fn(() => modulesChain),
		eq: jest.fn(() => modulesChain),
		select: jest.fn(() => modulesChain),
		single: jest.fn(),
	};

	const supabase = {
		from: jest.fn((table: string) => (table === 'modules_files' ? filesChain : modulesChain)),
	};

	return { supabase, filesChain, modulesChain };
}

function mockAdmin(supabase: unknown) {
	(requireCurrentUserAdmin as jest.Mock).mockResolvedValue({
		user: { id: 'admin-1' },
		adminSupabase: supabase,
	});
}

describe('submitModuleReviewAction', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('rejects when the current user is not an admin', async () => {
		(requireCurrentUserAdmin as jest.Mock).mockRejectedValue(new Error('FORBIDDEN'));

		const result = await submitModuleReviewAction(1, null, 100);

		expect(result).toEqual({
			success: false,
			error: 'No tenés permisos de administrador para realizar esta acción.',
		});
	});

	it('rejects when the module has no files to review', async () => {
		const { supabase, filesChain } = createSupabaseMock();
		mockAdmin(supabase);
		filesChain.eq.mockResolvedValue({ data: [], error: null });

		const result = await submitModuleReviewAction(1, null, 100);

		expect(result).toEqual({
			success: false,
			error: 'El módulo no tiene archivos para revisar.',
		});
	});

	it('rejects when at least one file has not been reviewed yet', async () => {
		const { supabase, filesChain } = createSupabaseMock();
		mockAdmin(supabase);
		filesChain.eq.mockResolvedValue({
			data: [{ status: 'approved' }, { status: null }],
			error: null,
		});

		const result = await submitModuleReviewAction(1, null, 100);

		expect(result).toEqual({
			success: false,
			error:
				'Todavía hay archivos sin revisar. Revisá todos los archivos antes de enviar la respuesta.',
		});
	});

	it('rejects an approved outcome without a valid amount', async () => {
		const { supabase, filesChain } = createSupabaseMock();
		mockAdmin(supabase);
		filesChain.eq.mockResolvedValue({
			data: [{ status: 'approved' }, { status: 'approved' }],
			error: null,
		});

		const result = await submitModuleReviewAction(1, null, 0);

		expect(result).toEqual({
			success: false,
			error: 'Para aprobar el módulo es necesario cargar un monto válido mayor a 0.',
		});
	});

	it('persists approved status with the entered amount when all files are approved', async () => {
		const { supabase, filesChain, modulesChain } = createSupabaseMock();
		mockAdmin(supabase);
		filesChain.eq.mockResolvedValue({
			data: [{ status: 'approved' }, { status: 'approved' }],
			error: null,
		});
		modulesChain.single.mockResolvedValue({
			data: { user_id: null, title: 'Módulo 1' },
			error: null,
		});

		const result = await submitModuleReviewAction(1, 'Todo bien', 1500);

		expect(result).toEqual({ success: true });
		expect(modulesChain.update).toHaveBeenCalledWith({
			status: 'approved',
			admin_description: 'Todo bien',
			amount: 1500,
		});
		expect(modulesChain.eq).toHaveBeenCalledWith('id', 1);
	});

	it('persists rejected status with a null amount when at least one file is rejected', async () => {
		const { supabase, filesChain, modulesChain } = createSupabaseMock();
		mockAdmin(supabase);
		filesChain.eq.mockResolvedValue({
			data: [{ status: 'approved' }, { status: 'rejected' }],
			error: null,
		});
		modulesChain.single.mockResolvedValue({
			data: { user_id: null, title: 'Módulo 1' },
			error: null,
		});

		const result = await submitModuleReviewAction(1, 'Falta algo', null);

		expect(result).toEqual({ success: true });
		expect(modulesChain.update).toHaveBeenCalledWith({
			status: 'rejected',
			admin_description: 'Falta algo',
			amount: null,
		});
	});
});
