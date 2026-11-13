import {
	listWithholdings,
	isValidPeriod,
	isIncomeTaxCondition,
	validateWithholdingInput,
	percentToRateFraction,
	getWithholdingByPaymentId,
} from '@/lib/withholdings/withholdings';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

/** Chainable query builder that resolves to `result` when awaited. */
function setup(result: { data?: any; error?: any }) {
	const chain: Record<string, any> = {};
	['select', 'order', 'eq', 'maybeSingle'].forEach((m) => {
		chain[m] = jest.fn(() => chain);
	});
	chain.then = (resolve: (v: any) => any) => resolve({ data: null, error: null, ...result });
	const from = jest.fn(() => chain);
	(getSupabaseClient as jest.Mock).mockReturnValue({ from });
	return { chain, from };
}

const row = {
	id: 1,
	expense_id: 10,
	payment_id: 99,
	date: '2026-10-01',
	period: '2026-10',
	tax_regime: 'Régimen general',
	imputed_amount: 1000,
	rate: 0.02,
	withheld_amount: 20,
	total_amount: 980,
	notes: null,
	created_at: '2026-10-01T00:00:00Z',
	expenses: { supplier_id: 5, suppliers: { name: 'Vidrios SA' } },
};

describe('lib/withholdings', () => {
	beforeEach(() => jest.clearAllMocks());

	it('selects with the expenses/suppliers join, ordered by date desc', async () => {
		const { chain, from } = setup({ data: [row] });
		const res = await listWithholdings();
		expect(from).toHaveBeenCalledWith('withholdings');
		expect(chain.select).toHaveBeenCalledWith('*, expenses!inner(supplier_id, suppliers(name))');
		expect(chain.order).toHaveBeenCalledWith('date', { ascending: false });
		expect(chain.eq).not.toHaveBeenCalled();
		expect(res.data).toEqual([
			{
				id: 1,
				expense_id: 10,
				payment_id: 99,
				date: '2026-10-01',
				period: '2026-10',
				tax_regime: 'Régimen general',
				imputed_amount: 1000,
				rate: 0.02,
				withheld_amount: 20,
				total_amount: 980,
				notes: null,
				created_at: '2026-10-01T00:00:00Z',
				supplier_name: 'Vidrios SA',
			},
		]);
	});

	it('filters by a valid period', async () => {
		const { chain } = setup({ data: [] });
		await listWithholdings({ period: '2026-10' });
		expect(chain.eq).toHaveBeenCalledWith('period', '2026-10');
	});

	it('ignores an invalid period format', async () => {
		const { chain } = setup({ data: [] });
		await listWithholdings({ period: '10-2026' });
		expect(chain.eq).not.toHaveBeenCalledWith('period', expect.anything());
	});

	it('filters by supplierId via the embedded expenses relation', async () => {
		const { chain } = setup({ data: [] });
		await listWithholdings({ supplierId: 5 });
		expect(chain.eq).toHaveBeenCalledWith('expenses.supplier_id', 5);
	});

	it('passes errors through', async () => {
		const err = { message: 'boom' };
		setup({ error: err });
		expect((await listWithholdings()).error).toBe(err);
	});

	it('handles the expenses/suppliers relation arriving as arrays', async () => {
		setup({
			data: [{ ...row, expenses: [{ supplier_id: 5, suppliers: [{ name: 'Vidrios SA' }] }] }],
		});
		const res = await listWithholdings();
		expect(res.data?.[0].supplier_name).toBe('Vidrios SA');
	});

	it('returns supplier_name null when the expense has no supplier (never drops the row)', async () => {
		setup({
			data: [{ ...row, expenses: { supplier_id: null, suppliers: null } }],
		});
		const res = await listWithholdings();
		expect(res.data?.[0].supplier_name).toBeNull();
	});
});

describe('isValidPeriod', () => {
	it('accepts AAAA-MM', () => {
		expect(isValidPeriod('2026-10')).toBe(true);
	});

	it('rejects other formats', () => {
		expect(isValidPeriod('2026/10')).toBe(false);
		expect(isValidPeriod('10-2026')).toBe(false);
		expect(isValidPeriod('')).toBe(false);
	});

	it('rejects month 00 and 13', () => {
		expect(isValidPeriod('2026-00')).toBe(false);
		expect(isValidPeriod('2026-13')).toBe(false);
	});

	it('accepts month boundaries 01 and 12', () => {
		expect(isValidPeriod('2026-01')).toBe(true);
		expect(isValidPeriod('2026-12')).toBe(true);
	});
});

describe('isIncomeTaxCondition', () => {
	it('accepts the 4 valid values', () => {
		expect(isIncomeTaxCondition('registered')).toBe(true);
		expect(isIncomeTaxCondition('not_registered')).toBe(true);
		expect(isIncomeTaxCondition('monotax')).toBe(true);
		expect(isIncomeTaxCondition('exempt')).toBe(true);
	});

	it('rejects invalid or empty values', () => {
		expect(isIncomeTaxCondition('')).toBe(false);
		expect(isIncomeTaxCondition('bogus')).toBe(false);
		expect(isIncomeTaxCondition(undefined)).toBe(false);
		expect(isIncomeTaxCondition(null)).toBe(false);
	});
});

describe('validateWithholdingInput', () => {
	it('accepts a valid input', () => {
		expect(
			validateWithholdingInput({ tax_regime: 'Régimen general', rate: 0.02, imputed_amount: 1000 })
		).toBeNull();
	});

	it('requires a non-empty regime', () => {
		expect(validateWithholdingInput({ tax_regime: '   ', rate: 0.02, imputed_amount: 1000 })).toBe(
			'El régimen de la retención es obligatorio.'
		);
	});

	it('rejects a rate outside 0-1', () => {
		expect(
			validateWithholdingInput({ tax_regime: 'Regimen', rate: -0.01, imputed_amount: 1000 })
		).toBe('La alícuota debe estar entre 0% y 100%.');
		expect(
			validateWithholdingInput({ tax_regime: 'Regimen', rate: 1.01, imputed_amount: 1000 })
		).toBe('La alícuota debe estar entre 0% y 100%.');
	});

	it('accepts rate boundaries 0 and 1', () => {
		expect(
			validateWithholdingInput({ tax_regime: 'Regimen', rate: 0, imputed_amount: 1000 })
		).toBeNull();
		expect(
			validateWithholdingInput({ tax_regime: 'Regimen', rate: 1, imputed_amount: 1000 })
		).toBeNull();
	});

	it('requires imputed_amount greater than 0', () => {
		expect(validateWithholdingInput({ tax_regime: 'Regimen', rate: 0.02, imputed_amount: 0 })).toBe(
			'El monto imputado debe ser mayor a 0.'
		);
		expect(
			validateWithholdingInput({ tax_regime: 'Regimen', rate: 0.02, imputed_amount: -5 })
		).toBe('El monto imputado debe ser mayor a 0.');
	});

	it('rejects more than 2 decimals on imputed_amount', () => {
		expect(
			validateWithholdingInput({ tax_regime: 'Regimen', rate: 0.02, imputed_amount: 1000.001 })
		).toBe('El monto imputado admite hasta 2 decimales.');
	});
});

describe('percentToRateFraction', () => {
	it('converts a whole percentage to its fraction', () => {
		expect(percentToRateFraction(2)).toBe(0.02);
		expect(percentToRateFraction(100)).toBe(1);
		expect(percentToRateFraction(0)).toBe(0);
	});

	it('rounds to 4 decimals to avoid float noise', () => {
		expect(percentToRateFraction(2.5)).toBe(0.025);
		expect(percentToRateFraction(33.333)).toBe(0.3333);
	});
});

describe('getWithholdingByPaymentId', () => {
	it('selects by payment_id and returns a single row', async () => {
		const { chain, from } = setup({ data: row });

		const res = await getWithholdingByPaymentId(99);

		expect(from).toHaveBeenCalledWith('withholdings');
		expect(chain.select).toHaveBeenCalledWith('*');
		expect(chain.eq).toHaveBeenCalledWith('payment_id', 99);
		expect(chain.maybeSingle).toHaveBeenCalled();
		expect(res.data).toEqual(row);
	});

	it('resolves to null when no withholding exists for the payment', async () => {
		const { chain } = setup({ data: null });

		const res = await getWithholdingByPaymentId(1);

		expect(res.data).toBeNull();
		expect(chain.eq).toHaveBeenCalledWith('payment_id', 1);
	});

	it('passes errors through', async () => {
		const err = { message: 'boom' };
		setup({ error: err });

		expect((await getWithholdingByPaymentId(1)).error).toBe(err);
	});
});
