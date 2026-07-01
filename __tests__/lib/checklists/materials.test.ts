import {
	listMaterials,
	getMaterialById,
	createMaterial,
	updateMaterial,
	deleteMaterial,
} from '@/lib/checklists/materials';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

describe('materials lib', () => {
	const mockSelect = jest.fn();
	const mockEq = jest.fn();
	const mockOrder = jest.fn();
	const mockSingle = jest.fn();
	const mockInsert = jest.fn();
	const mockUpdate = jest.fn();
	const mockDelete = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(console, 'error').mockImplementation(() => {});

		mockOrder.mockResolvedValue({ data: [], error: null });
		mockEq.mockReturnValue({ single: mockSingle, order: mockOrder });
		mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
		mockInsert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) });
		mockUpdate.mockReturnValue({
			eq: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockSingle }) }),
		});
		mockDelete.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

		(getSupabaseClient as jest.Mock).mockReturnValue({
			from: jest.fn().mockReturnValue({
				select: mockSelect,
				insert: mockInsert,
				update: mockUpdate,
				delete: mockDelete,
			}),
		});
	});

	describe('listMaterials', () => {
		it('returns materials ordered by name', async () => {
			const materials = [
				{ id: 1, name: 'Aglomerado' },
				{ id: 2, name: 'MDF' },
			];
			mockOrder.mockResolvedValue({ data: materials, error: null });

			const { data } = await listMaterials();
			expect(data).toHaveLength(2);
			expect(data![0].name).toBe('Aglomerado');
		});

		it('returns error when query fails', async () => {
			mockOrder.mockResolvedValue({ data: null, error: new Error('Query failed') });

			const { data, error } = await listMaterials();
			expect(data).toBeNull();
			expect(error).toBeTruthy();
		});
	});

	describe('getMaterialById', () => {
		it('returns a material by id', async () => {
			const material = { id: 1, name: 'MDF' };
			mockSingle.mockResolvedValue({ data: material, error: null });

			const { data } = await getMaterialById(1);
			expect(data?.id).toBe(1);
			expect(data?.name).toBe('MDF');
		});

		it('returns null when not found', async () => {
			mockSingle.mockResolvedValue({ data: null, error: null });

			const { data } = await getMaterialById(999);
			expect(data).toBeNull();
		});
	});

	describe('createMaterial', () => {
		it('creates a material and returns it', async () => {
			const newMaterial = { name: 'Enchapado' };
			mockSingle.mockResolvedValue({ data: { id: 3, ...newMaterial }, error: null });

			const { data } = await createMaterial(newMaterial);
			expect(data?.id).toBe(3);
			expect(data?.name).toBe('Enchapado');
		});

		it('returns error on failure', async () => {
			mockSingle.mockResolvedValue({ data: null, error: new Error('Insert failed') });

			const { data, error } = await createMaterial({ name: 'Test' });
			expect(data).toBeNull();
			expect(error).toBeTruthy();
		});
	});

	describe('updateMaterial', () => {
		it('updates a material name', async () => {
			mockSingle.mockResolvedValue({ data: { id: 1, name: 'Updated' }, error: null });

			const { data } = await updateMaterial(1, { name: 'Updated' });
			expect(data?.name).toBe('Updated');
		});
	});

	describe('deleteMaterial', () => {
		it('deletes a material', async () => {
			const { error } = await deleteMaterial(1);
			expect(error).toBeNull();
		});
	});
});
