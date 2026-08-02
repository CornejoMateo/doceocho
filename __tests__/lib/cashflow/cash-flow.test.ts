import {
	createBankAccount,
	deleteBankAccount,
	listActiveBankAccounts,
	listBankAccounts,
	updateBankAccount,
	getOpenCashBox,
	getCashBoxWithTransactions,
	createCashBox,
	updateCashBox,
	closeCashBox,
	deleteCashBox,
	listCashBoxes,
	getCashBoxSummary,
	listTransactions,
	getTransactionById,
	createTransaction,
	updateTransaction,
	deleteTransaction,
	getTransactionsByCashBoxId,
	getBankAccountById,
	getCashBoxById,
} from '@/lib/cash-flow/cash-flow';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createChain() {
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
	return chain;
}

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
};

const mockCashBox = {
	id: 1,
	created_at: '2024-01-01',
	opening_balance: 100,
	closing_balance: null,
	is_closed: false,
	closed_at: null,
	notes: null,
};

const mockTransaction = {
	id: 1,
	created_at: '2024-01-01',
	cash_box_id: 1,
	type: 'income',
	amount: 50,
	category: 'Venta',
	description: null,
	bank_account_id: null,
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
				}),
			'single',
		],
		['updateBankAccount', () => updateBankAccount(1, { name: 'x' }), 'single'],
		['createCashBox', () => createCashBox({ opening_balance: 100, is_closed: false }), 'single'],
		['updateCashBox', () => updateCashBox(1, { opening_balance: 200 }), 'single'],
		['closeCashBox', () => closeCashBox(1, 500), 'single'],
		[
			'createTransaction',
			() =>
				createTransaction({
					cash_box_id: 1,
					type: 'income',
					amount: 10,
					category: 'x',
					description: null,
					bank_account_id: null,
				}),
			'single',
		],
		['updateTransaction', () => updateTransaction(1, { amount: 10 }), 'single'],
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

it('deleteCashBox propagates the supabase error', async () => {
	const { supabase, chain } = createSupabaseMock();
	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

	const error = new Error('delete failed');
	chain.delete.mockReturnValue(chain);
	chain.eq.mockResolvedValue({ error });

	const result = await deleteCashBox(1);

	expect(result.error).toBe(error);
});

it('deleteTransaction propagates the supabase error', async () => {
	const { supabase, chain } = createSupabaseMock();
	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

	const error = new Error('delete failed');
	chain.delete.mockReturnValue(chain);
	chain.eq.mockResolvedValue({ error });

	const result = await deleteTransaction(1);

	expect(result.error).toBe(error);
});

it('listTransactions propagates the supabase error', async () => {
	const { supabase, chain } = createSupabaseMock();
	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

	const error = new Error('query failed');
	chain.select.mockReturnValue(chain);
	chain.order.mockResolvedValue({ data: null, error });

	const result = await listTransactions();

	expect(result.data).toBeNull();
	expect(result.error).toBe(error);
});

it('getTransactionsByCashBoxId propagates the supabase error', async () => {
	const { supabase, chain } = createSupabaseMock();
	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

	const error = new Error('query failed');
	chain.select.mockReturnValue(chain);
	chain.eq.mockReturnValue(chain);
	chain.order.mockResolvedValue({ data: null, error });

	const result = await getTransactionsByCashBoxId(10);

	expect(result.data).toBeNull();
	expect(result.error).toBe(error);
});

it('getCashBoxWithTransactions propagates the supabase error', async () => {
	const { supabase, chain } = createSupabaseMock();
	(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

	const error = new Error('query failed');
	chain.select.mockReturnValue(chain);
	chain.eq.mockReturnValue(chain);
	chain.single.mockResolvedValue({ data: null, error });

	const result = await getCashBoxWithTransactions(1);

	expect(result.data).toBeNull();
	expect(result.error).toBe(error);
});

describe('Cash Boxes', () => {
	it('getOpenCashBox returns latest open cash box', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.select.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.order.mockReturnValue(chain);
		chain.limit.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: mockCashBox,
			error: null,
		});

		const result = await getOpenCashBox();

		expect(supabase.from).toHaveBeenCalledWith('cash_boxes');
		expect(chain.select).toHaveBeenCalledWith('*');
		expect(chain.eq).toHaveBeenCalledWith('is_closed', false);
		expect(chain.order).toHaveBeenCalledWith('created_at', {
			ascending: false,
		});
		expect(chain.limit).toHaveBeenCalledWith(1);
		expect(chain.single).toHaveBeenCalled();

		expect(result.data).toEqual(mockCashBox);
		expect(result.error).toBeNull();
	});

	it('getCashBoxWithTransactions sorts transactions by date desc', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const data = {
			...mockCashBox,
			transactions: [
				{ id: 1, created_at: '2024-01-01' },
				{ id: 2, created_at: '2024-03-01' },
				{ id: 3, created_at: '2024-02-01' },
			],
		};

		chain.select.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data,
			error: null,
		});

		const result = await getCashBoxWithTransactions(1);

		expect(result.data?.transactions?.map((t: any) => t.id)).toEqual([2, 3, 1]);
	});

	it('createCashBox creates cash box', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.insert.mockReturnValue(chain);
		chain.select.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: mockCashBox,
			error: null,
		});

		const payload = {
			opening_balance: 100,
			closing_balance: null,
			is_closed: false,
			closed_at: null,
			notes: null,
		};

		const result = await createCashBox(payload);

		expect(supabase.from).toHaveBeenCalledWith('cash_boxes');
		expect(chain.insert).toHaveBeenCalledWith(payload);
		expect(result.data).toEqual(mockCashBox);
	});

	it('updateCashBox updates cash box', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const updated = {
			...mockCashBox,
			opening_balance: 250,
		};

		chain.update.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.select.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: updated,
			error: null,
		});

		const result = await updateCashBox(1, {
			opening_balance: 250,
		});

		expect(chain.update).toHaveBeenCalledWith({
			opening_balance: 250,
		});

		expect(chain.eq).toHaveBeenCalledWith('id', 1);

		expect(result.data).toEqual(updated);
	});

	it('closeCashBox closes cash box correctly', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.update.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.select.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: {
				...mockCashBox,
				is_closed: true,
			},
			error: null,
		});

		await closeCashBox(1, 500, 'Closed');

		expect(chain.update).toHaveBeenCalledWith({
			closing_balance: 500,
			is_closed: true,
			closed_at: expect.any(String),
			notes: 'Closed',
		});
	});

	it('deleteCashBox deletes cash box', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.delete.mockReturnValue(chain);
		chain.eq.mockResolvedValue({
			error: null,
		});

		const result = await deleteCashBox(1);

		expect(supabase.from).toHaveBeenCalledWith('cash_boxes');
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.eq).toHaveBeenCalledWith('id', 1);

		expect(result.data).toBeNull();
		expect(result.error).toBeNull();
	});

	describe('getCashBoxSummary', () => {
		it('calculates totals', async () => {
			const boxChain = createChain();
			const txChain = createChain();
			const supabase = { from: jest.fn() };
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			supabase.from
				.mockReturnValueOnce(boxChain) // query cash_boxes
				.mockReturnValueOnce(txChain); // query transactions_box

			boxChain.select.mockReturnValue(boxChain);
			boxChain.eq.mockReturnValue(boxChain);
			boxChain.single.mockResolvedValue({ data: mockCashBox, error: null });

			txChain.select.mockReturnValue(txChain);
			txChain.eq.mockResolvedValue({
				data: [
					{ type: 'income', amount: 50 },
					{ type: 'income', amount: 20 },
					{ type: 'expense', amount: 30 },
					{ type: 'expense', amount: 5 },
				],
				error: null,
			});

			const result = await getCashBoxSummary(1);

			expect(supabase.from).toHaveBeenNthCalledWith(1, 'cash_boxes');
			expect(supabase.from).toHaveBeenNthCalledWith(2, 'transactions_box');
			expect(boxChain.eq).toHaveBeenCalledWith('id', 1);
			expect(txChain.eq).toHaveBeenCalledWith('cash_box_id', 1);

			expect(result.data).toEqual({
				id: 1,
				opening_balance: 100,
				total_income: 70,
				total_expense: 35,
				current_balance: 135,
				closing_balance: null,
				is_closed: false,
				transaction_count: 4,
			});
		});

		it('returns opening balance when there are no transactions', async () => {
			const boxChain = createChain();
			const txChain = createChain();
			const supabase = { from: jest.fn() };
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			supabase.from.mockReturnValueOnce(boxChain).mockReturnValueOnce(txChain);

			boxChain.select.mockReturnValue(boxChain);
			boxChain.eq.mockReturnValue(boxChain);
			boxChain.single.mockResolvedValue({ data: mockCashBox, error: null });

			txChain.select.mockReturnValue(txChain);
			txChain.eq.mockResolvedValue({ data: [], error: null });

			const result = await getCashBoxSummary(1);

			expect(result.data?.total_income).toBe(0);
			expect(result.data?.total_expense).toBe(0);
			expect(result.data?.current_balance).toBe(100);
			expect(result.data?.transaction_count).toBe(0);
		});

		it('coerces string numeric amounts before summing', async () => {
			const boxChain = createChain();
			const txChain = createChain();
			const supabase = { from: jest.fn() };
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			supabase.from.mockReturnValueOnce(boxChain).mockReturnValueOnce(txChain);

			boxChain.select.mockReturnValue(boxChain);
			boxChain.eq.mockReturnValue(boxChain);
			boxChain.single.mockResolvedValue({
				data: { ...mockCashBox, opening_balance: '100' },
				error: null,
			});

			txChain.select.mockReturnValue(txChain);
			txChain.eq.mockResolvedValue({
				data: [
					{ type: 'income', amount: '50' },
					{ type: 'expense', amount: '30' },
				],
				error: null,
			});

			const result = await getCashBoxSummary(1);

			// Si alguien saca el Number(...) del código, esto falla con "10050" en vez de 120
			expect(result.data?.current_balance).toBe(120);
			expect(result.data?.total_income).toBe(50);
			expect(result.data?.total_expense).toBe(30);
		});

		it('returns box error and does not query transactions', async () => {
			const boxChain = createChain();
			const txChain = createChain();
			const supabase = { from: jest.fn() };
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			supabase.from.mockReturnValueOnce(boxChain).mockReturnValueOnce(txChain);

			const error = new Error('box error');
			boxChain.select.mockReturnValue(boxChain);
			boxChain.eq.mockReturnValue(boxChain);
			boxChain.single.mockResolvedValue({ data: null, error });

			const result = await getCashBoxSummary(1);

			expect(result.data).toBeNull();
			expect(result.error).toBe(error);
			expect(txChain.select).not.toHaveBeenCalled();
		});

		it('returns transaction error', async () => {
			const boxChain = createChain();
			const txChain = createChain();
			const supabase = { from: jest.fn() };
			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			supabase.from.mockReturnValueOnce(boxChain).mockReturnValueOnce(txChain);

			boxChain.select.mockReturnValue(boxChain);
			boxChain.eq.mockReturnValue(boxChain);
			boxChain.single.mockResolvedValue({ data: mockCashBox, error: null });

			const error = new Error('transaction error');
			txChain.select.mockReturnValue(txChain);
			txChain.eq.mockResolvedValue({ data: null, error });

			const result = await getCashBoxSummary(1);

			expect(result.data).toBeNull();
			expect(result.error).toBe(error);
		});
	});

	it('listCashBoxes returns all cash boxes ordered by created_at desc', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.select.mockReturnValue(chain);
		chain.order.mockResolvedValue({ data: [mockCashBox], error: null });

		const result = await listCashBoxes();

		expect(supabase.from).toHaveBeenCalledWith('cash_boxes');
		expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
		expect(result.data).toEqual([mockCashBox]);
	});

	it('getCashBoxById returns the matching cash box', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.select.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.single.mockResolvedValue({ data: mockCashBox, error: null });

		const result = await getCashBoxById(1);

		expect(supabase.from).toHaveBeenCalledWith('cash_boxes');
		expect(chain.eq).toHaveBeenCalledWith('id', 1);
		expect(result.data).toEqual(mockCashBox);
	});
});

describe('Transactions', () => {
	it('listTransactions returns all transactions', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const transactions = [mockTransaction];

		chain.select.mockReturnValue(chain);
		chain.order.mockResolvedValue({
			data: transactions,
			error: null,
		});

		const result = await listTransactions();

		expect(supabase.from).toHaveBeenCalledWith('transactions_box');
		expect(chain.select).toHaveBeenCalledWith('*, bank_account:bank_accounts(*)');
		expect(chain.order).toHaveBeenCalledWith('created_at', {
			ascending: false,
		});

		expect(result.data).toEqual(transactions);
		expect(result.error).toBeNull();
	});

	it('listTransactions filters by cash box id', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.select.mockReturnValue(chain);
		chain.order.mockReturnValue(chain);
		chain.eq.mockResolvedValue({
			data: [mockTransaction],
			error: null,
		});

		await listTransactions(5);

		expect(chain.eq).toHaveBeenCalledWith('cash_box_id', 5);
	});

	it('getTransactionById returns transaction', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.select.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: mockTransaction,
			error: null,
		});

		const result = await getTransactionById(1);

		expect(supabase.from).toHaveBeenCalledWith('transactions_box');
		expect(chain.eq).toHaveBeenCalledWith('id', 1);
		expect(result.data).toEqual(mockTransaction);
	});

	it('createTransaction creates transaction', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const payload = {
			cash_box_id: 1,
			type: 'income',
			amount: 100,
			category: 'Ventas',
			description: 'Pago',
			bank_account_id: null,
		};

		chain.insert.mockReturnValue(chain);
		chain.select.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: mockTransaction,
			error: null,
		});

		const result = await createTransaction(payload);

		expect(supabase.from).toHaveBeenCalledWith('transactions_box');
		expect(chain.insert).toHaveBeenCalledWith(payload);
		expect(result.data).toEqual(mockTransaction);
	});

	it('updateTransaction updates transaction', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		const updated = {
			...mockTransaction,
			amount: 250,
		};

		chain.update.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.select.mockReturnValue(chain);
		chain.single.mockResolvedValue({
			data: updated,
			error: null,
		});

		const result = await updateTransaction(1, {
			amount: 250,
		});

		expect(chain.update).toHaveBeenCalledWith({
			amount: 250,
		});

		expect(chain.eq).toHaveBeenCalledWith('id', 1);
		expect(result.data).toEqual(updated);
	});

	it('deleteTransaction deletes transaction', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.delete.mockReturnValue(chain);
		chain.eq.mockResolvedValue({
			error: null,
		});

		const result = await deleteTransaction(1);

		expect(supabase.from).toHaveBeenCalledWith('transactions_box');
		expect(chain.delete).toHaveBeenCalled();
		expect(chain.eq).toHaveBeenCalledWith('id', 1);

		expect(result.data).toBeNull();
		expect(result.error).toBeNull();
	});

	it('getTransactionsByCashBoxId returns ordered transactions', async () => {
		const { supabase, chain } = createSupabaseMock();
		(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

		chain.select.mockReturnValue(chain);
		chain.eq.mockReturnValue(chain);
		chain.order.mockResolvedValue({
			data: [mockTransaction],
			error: null,
		});

		const result = await getTransactionsByCashBoxId(10);

		expect(supabase.from).toHaveBeenCalledWith('transactions_box');
		expect(chain.eq).toHaveBeenCalledWith('cash_box_id', 10);
		expect(chain.order).toHaveBeenCalledWith('created_at', {
			ascending: true,
		});

		expect(result.data).toEqual([mockTransaction]);
	});
});
