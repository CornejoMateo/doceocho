import { CLIENT_BUDGET_TYPE, fileBudgetInClient } from '@/lib/budget-builder/client-budget';
import { createBudget as createDraft } from '@/helpers/budget-builder/calculate';
import { DEFAULT_SETTINGS } from '@/constants/budget-builder/budget-builder';
import type { Budget } from '@/lib/budget-builder/types';

const mockCreateBudget = jest.fn();
const mockEditBudget = jest.fn();
const mockGetBudgetById = jest.fn();
const mockGetFolders = jest.fn();
const mockCreateFolder = jest.fn();
const mockRemove = jest.fn();
const mockLinkUpdate = jest.fn();

jest.mock('@/lib/budgets/budgets', () => ({
	createBudget: (...args: any[]) => mockCreateBudget(...args),
	editBudget: (...args: any[]) => mockEditBudget(...args),
	getBudgetById: (...args: any[]) => mockGetBudgetById(...args),
}));

jest.mock('@/lib/budgets/folder_budgets', () => ({
	getFolderBudgetsByClientId: (...args: any[]) => mockGetFolders(...args),
	createFolderBudget: (...args: any[]) => mockCreateFolder(...args),
}));

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: () => ({
		storage: { from: () => ({ remove: (...args: any[]) => mockRemove(...args) }) },
		from: () => ({
			update: (values: any) => ({
				eq: () => {
					mockLinkUpdate(values);
					return Promise.resolve({ error: null });
				},
			}),
		}),
	}),
}));

// The PDF itself is covered elsewhere; here only that a file goes out.
jest.mock('@/helpers/budget-builder/pdf', () => ({
	buildBudgetPdf: () => ({ output: () => new Blob(['%PDF'], { type: 'application/pdf' }) }),
}));

const budget = (overrides: Partial<Budget> = {}): Budget => ({
	...createDraft(DEFAULT_SETTINGS, []),
	id: 'bb-1',
	number: 3,
	clientId: 10,
	clientName: 'Ana',
	...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('lib/budget-builder/client-budget', () => {
	test('does nothing for someone who is not a loaded client', async () => {
		await expect(
			fileBudgetInClient(budget({ clientId: null }), DEFAULT_SETTINGS.company)
		).resolves.toEqual({
			linkedBudgetId: null,
			error: null,
		});
		expect(mockCreateBudget).not.toHaveBeenCalled();
	});

	test('the first time it files a new entry in the folder without a work', async () => {
		mockGetFolders.mockResolvedValue({
			data: [
				{ id: 5, work_id: 99 },
				{ id: 6, work_id: null },
			],
			error: null,
		});
		mockCreateBudget.mockResolvedValue({ data: { id: 77 }, error: null });

		const result = await fileBudgetInClient(budget(), DEFAULT_SETTINGS.company);

		expect(result).toEqual({ linkedBudgetId: 77, error: null });
		const [fields, file, clientId] = mockCreateBudget.mock.calls[0];
		expect(fields).toMatchObject({
			folder_budget_id: 6,
			number: 'P-0003',
			type: CLIENT_BUDGET_TYPE,
		});
		expect(file).toBeInstanceOf(File);
		expect(file.name).toBe('P-0003.pdf');
		expect(clientId).toBe(10);
		expect(mockLinkUpdate).toHaveBeenCalledWith({ linked_budget_id: 77 });
		expect(mockCreateFolder).not.toHaveBeenCalled();
	});

	test('creates the folder when the client has none without a work', async () => {
		mockGetFolders.mockResolvedValue({ data: [], error: null });
		mockCreateFolder.mockResolvedValue({ data: { id: 8 }, error: null });
		mockCreateBudget.mockResolvedValue({ data: { id: 78 }, error: null });

		await fileBudgetInClient(budget(), DEFAULT_SETTINGS.company);

		expect(mockCreateFolder).toHaveBeenCalledWith({ client_id: 10, work_id: null });
		expect(mockCreateBudget.mock.calls[0][0]).toMatchObject({ folder_budget_id: 8 });
	});

	test('a new version replaces the same entry and its old PDF instead of duplicating', async () => {
		mockGetBudgetById.mockResolvedValue({ data: { id: 77, pdf_path: '10/old.pdf' }, error: null });
		mockEditBudget.mockResolvedValue({ data: { id: 77 }, error: null });

		const result = await fileBudgetInClient(
			budget({ linkedBudgetId: 77 }),
			DEFAULT_SETTINGS.company
		);

		expect(result).toEqual({ linkedBudgetId: 77, error: null });
		expect(mockEditBudget).toHaveBeenCalledWith(
			77,
			expect.objectContaining({ number: 'P-0003' }),
			expect.any(File),
			10
		);
		expect(mockRemove).toHaveBeenCalledWith(['10/old.pdf']);
		expect(mockCreateBudget).not.toHaveBeenCalled();
	});

	test('if the entry was deleted from the client, it files a fresh one', async () => {
		mockGetBudgetById.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
		mockGetFolders.mockResolvedValue({ data: [{ id: 6, work_id: null }], error: null });
		mockCreateBudget.mockResolvedValue({ data: { id: 90 }, error: null });

		const result = await fileBudgetInClient(
			budget({ linkedBudgetId: 77 }),
			DEFAULT_SETTINGS.company
		);

		expect(result.linkedBudgetId).toBe(90);
		expect(mockEditBudget).not.toHaveBeenCalled();
	});
});
