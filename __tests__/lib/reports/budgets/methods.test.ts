import { listBudgetsForReport } from '@/lib/reports/budgets/methods';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
	};
	const supabase = { from: jest.fn(() => chain) };
	return { supabase, chain };
}

describe('listBudgetsForReport', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('selects the work name alongside address and locality', async () => {
		const { supabase, chain } = createSupabaseMock();
		chain.order = jest.fn().mockResolvedValue({ data: [], error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		await listBudgetsForReport();

		expect(supabase.from).toHaveBeenCalledWith('budgets');
		expect(chain.select).toHaveBeenCalledWith(
			expect.stringContaining('work:works(address, locality, name)')
		);
	});

	it('maps the work including its name', async () => {
		const { supabase, chain } = createSupabaseMock();
		const mockData = [
			{
				id: 1,
				created_at: '2024-01-01',
				folder_budget: {
					id: 10,
					work_id: 20,
					work: { address: 'Calle 123', locality: 'Rosario', name: 'Obra Centro' },
					client: { id: 5, name: 'Juan', last_name: 'Pérez' },
				},
			},
		];
		chain.order = jest.fn().mockResolvedValue({ data: mockData, error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const { data } = await listBudgetsForReport();

		expect(data?.[0].folder_budget?.work).toEqual({
			address: 'Calle 123',
			locality: 'Rosario',
			name: 'Obra Centro',
		});
	});

	it('falls back to empty values when work is null', async () => {
		const { supabase, chain } = createSupabaseMock();
		const mockData = [
			{
				id: 1,
				created_at: '2024-01-01',
				folder_budget: { id: 10, work_id: null, work: null, client: null },
			},
		];
		chain.order = jest.fn().mockResolvedValue({ data: mockData, error: null });
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const { data } = await listBudgetsForReport();

		expect(data?.[0].folder_budget?.work).toEqual({
			address: '',
			locality: '',
			name: '',
		});
	});
});
