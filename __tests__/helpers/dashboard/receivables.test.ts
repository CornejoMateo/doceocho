import { calculateReceivables, EMPTY_RECEIVABLES } from '@/helpers/dashboard/receivables';

const noTotals = {};

describe('helpers/dashboard/receivables', () => {
	test('adds up what is left on each account', () => {
		const result = calculateReceivables(
			[
				{ id: 1, balance_amount_ars: 100000, client_id: 10 },
				{ id: 2, balance_amount_ars: 50000, client_id: 20 },
			],
			{
				1: { totalAmount: 40000, totalAmountUSD: 0 },
				2: { totalAmount: 10000, totalAmountUSD: 0 },
			}
		);

		expect(result).toEqual({ totalArs: 100000, balancesCount: 2, clientsCount: 2 });
	});

	test('counts extras as more to collect, like the balances report does', () => {
		const result = calculateReceivables([{ id: 1, balance_amount_ars: 100000, client_id: 10 }], {
			1: { totalAmount: 100000, totalAmountUSD: 0, totalExtraAmount: 25000 },
		});

		expect(result.totalArs).toBe(25000);
	});

	test('leaves out accounts that are already settled', () => {
		const result = calculateReceivables([{ id: 1, balance_amount_ars: 100000, client_id: 10 }], {
			1: { totalAmount: 100000, totalAmountUSD: 0 },
		});

		expect(result).toEqual(EMPTY_RECEIVABLES);
	});

	test('an overpaid account never lowers the amount to collect', () => {
		const result = calculateReceivables(
			[
				{ id: 1, balance_amount_ars: 100000, client_id: 10 },
				// This client paid 20.000 more than they owed.
				{ id: 2, balance_amount_ars: 50000, client_id: 20 },
			],
			{
				1: { totalAmount: 40000, totalAmountUSD: 0 },
				2: { totalAmount: 70000, totalAmountUSD: 0 },
			}
		);

		expect(result).toEqual({ totalArs: 60000, balancesCount: 1, clientsCount: 1 });
	});

	test('counts a client once even with several open accounts', () => {
		const result = calculateReceivables(
			[
				{ id: 1, balance_amount_ars: 100000, client_id: 10 },
				{ id: 2, balance_amount_ars: 50000, client_id: 10 },
			],
			noTotals
		);

		expect(result).toEqual({ totalArs: 150000, balancesCount: 2, clientsCount: 1 });
	});

	test('treats a missing totals entry as nothing paid', () => {
		const result = calculateReceivables(
			[{ id: 99, balance_amount_ars: 30000, client_id: 10 }],
			noTotals
		);

		expect(result.totalArs).toBe(30000);
	});

	test('survives an account with no amount loaded', () => {
		const result = calculateReceivables([{ id: 1, balance_amount_ars: null, client_id: 10 }], {
			1: { totalAmount: 0, totalAmountUSD: 0 },
		});

		expect(result).toEqual(EMPTY_RECEIVABLES);
	});

	test('an account without a client still counts towards the money', () => {
		const result = calculateReceivables([{ id: 1, balance_amount_ars: 80000 }], noTotals);

		expect(result).toEqual({ totalArs: 80000, balancesCount: 1, clientsCount: 0 });
	});

	test('no accounts means nothing to collect', () => {
		expect(calculateReceivables([], noTotals)).toEqual(EMPTY_RECEIVABLES);
	});
});
