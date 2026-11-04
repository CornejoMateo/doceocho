import {
	createBankAccount,
	deleteBankAccount,
	listActiveBankAccounts,
	listBankAccounts,
	updateBankAccount,
	getBankAccountById,
} from '@/lib/cash-flow/cash-flow';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock() {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		insert: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		single: jest.fn(() => chain),
		limit: jest.fn(() => chain),
		in: jest.fn(() => chain),
	};

	const supabase = {
		from: jest.fn(() => chain),
	};

	return { supabase, chain };
}

const mockBankAccount = {
	id: 1,
	created_at: '2024-01-01',
	name: 'Santander',
	bank: 'Santander',
	account_number: '123456',
	account_type: 'Checking',
	is_active: true,
	initial_balance: 0,
};

describe('Bank Accounts', () => {
	it('listActiveBankAccounts returns only active accounts', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const accounts = [mockBankAccount];

		chain.select.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.order.mockResolvedValue({
			data: accounts,
			error: null,
		});

		const result = await listActiveBankAccounts();

		expect(supabase.from).toHaveBeenCalledWith('bank_accounts');
		expect(chain.select).toHaveBeenCalledWith('*');
		expect(chain.eq).toHaveBeenCalledWith('is_active', true);
		expect(chain.order).toHaveBeenCalledWith('created_at', {
			ascending: false,
		});

		expect(result.data).toEqual(accounts);
		expect(result.error).toBeNull();
	});

	it('createBankAccount creates account', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.insert.mockReturnValue(chain);
		chain.select.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: mockBankAccount,
			error: null,
		});

		const payload = {
			name: 'Santander',
			bank: 'Santander',
			account_number: '123',
			account_type: 'Checking',
			is_active: true,
			initial_balance: 0,
		};

		const result = await createBankAccount(payload);

		expect(supabase.from).toHaveBeenCalledWith('bank_accounts');
		expect(chain.insert).toHaveBeenCalledWith(payload);
		expect(chain.select).toHaveBeenCalled();
		expect(chain.single).toHaveBeenCalled();

		expect(result.data).toEqual(mockBankAccount);
	});

	it('updateBankAccount updates account', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const updated = {
			...mockBankAccount,
			name: 'Updated',
		};

		chain.update.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.select.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: updated,
			error: null,
		});

		const result = await updateBankAccount(1, {
			name: 'Updated',
		});

		expect(chain.update).toHaveBeenCalledWith({
			name: 'Updated',
		});

		expect(chain.eq).toHaveBeenCalledWith('id', 1);

		expect(result.data).toEqual(updated);
	});

	it('deleteBankAccount deletes account', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.delete.mockReturnValue(chain);
		chain.eq.mockResolvedValue({
			error: null,
		});

		const result = await deleteBankAccount(1);

		expect(supabase.from).toHaveBeenCalledWith('bank_accounts');
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.eq).toHaveBeenCalledWith('id', 1);

		expect(result.data).toBeNull();
		expect(result.error).toBeNull();
	});

	it('listBankAccounts returns all accounts without filtering by is_active', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const accounts = [mockBankAccount, { ...mockBankAccount, id: 2, is_active: false }];

		chain.select.mockReturnValue(chain);
		chain.order.mockResolvedValue({ data: accounts, error: null });

		const result = await listBankAccounts();

		expect(supabase.from).toHaveBeenCalledWith('bank_accounts');
		expect(chain.select).toHaveBeenCalledWith('*');
		expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
		expect(chain.eq).not.toHaveBeenCalled(); // no debe filtrar por is_active
		expect(result.data).toEqual(accounts);
	});

	it('getBankAccountById returns the matching account', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.select.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.maybeSingle = jest.fn().mockResolvedValue({ data: mockBankAccount, error: null });

		const result = await getBankAccountById(1);

		expect(supabase.from).toHaveBeenCalledWith('bank_accounts');
		expect(chain.eq).toHaveBeenCalledWith('id', 1);
		expect(result.data).toEqual(mockBankAccount);
	});

	it('getBankAccountById returns null when not found', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.select.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

		const result = await getBankAccountById(999);

		expect(result.data).toBeNull();
		expect(result.error).toBeNull();
	});
});

describe('error propagation', () => {
	it.each([
		[
			'createBankAccount',
			() =>
				createBankAccount({
					name: 'x',
					bank: 'x',
					account_number: '1',
					account_type: 'x',
					is_active: true,
					initial_balance: 0,
				}),
			'single',
		],
		['updateBankAccount', () => updateBankAccount(1, { name: 'x' }), 'single'],
	])('%s propagates the supabase error', async (_name, fn, terminal) => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const error = new Error('supabase error');
		chain.select.mockReturnValue(chain);
		chain.insert.mockReturnValue(chain);
		chain.update.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		(chain as any)[terminal].mockResolvedValue({ data: null, error });

		const result = await fn();

		expect(result.data).toBeNull();
		expect(result.error).toBe(error);
	});
});

it('deleteBankAccount propagates the supabase error', async () => {
	const { supabase, chain } = createSupabaseMock();
	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

	const error = new Error('delete failed');
	chain.delete.mockReturnValue(chain);
	chain.eq.mockResolvedValue({ error });

	const result = await deleteBankAccount(1);

	expect(result.error).toBe(error);
});
