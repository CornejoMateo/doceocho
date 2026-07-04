import { calculateBalanceStats } from '@/helpers/balances/stats';
import { BALANCE_TYPES } from '@/constants/balances/balances-report';

describe('calculateBalanceStats', () => {
	it('returns zeros for empty balances', () => {
		const result = calculateBalanceStats([]);

		expect(result).toEqual({
			totalDebtors: 0,
			totalCreditors: 0,
			total: 0,
			debtorsCount: 0,
			creditorsCount: 0,
		});
	});

	it('aggregates debtor balances', () => {
		const result = calculateBalanceStats([
			{ balanceType: BALANCE_TYPES.DEBTOR, balanceAmountArs: 50000 },
			{ balanceType: BALANCE_TYPES.DEBTOR, balanceAmountArs: 30000 },
			{ balanceType: BALANCE_TYPES.CANCELLED, balanceAmountArs: 0 },
		]);

		expect(result.totalDebtors).toBe(80000);
		expect(result.debtorsCount).toBe(2);
		expect(result.totalCreditors).toBe(0);
		expect(result.creditorsCount).toBe(0);
	});

	it('aggregates creditor balances with absolute values', () => {
		const result = calculateBalanceStats([
			{ balanceType: BALANCE_TYPES.CREDITOR, balanceAmountArs: -20000 },
			{ balanceType: BALANCE_TYPES.CREDITOR, balanceAmountArs: -15000 },
		]);

		expect(result.totalCreditors).toBe(35000);
		expect(result.creditorsCount).toBe(2);
		expect(result.totalDebtors).toBe(0);
		expect(result.debtorsCount).toBe(0);
	});

	it('handles mixed debtor and creditor balances', () => {
		const result = calculateBalanceStats([
			{ balanceType: BALANCE_TYPES.DEBTOR, balanceAmountArs: 100000 },
			{ balanceType: BALANCE_TYPES.CREDITOR, balanceAmountArs: -30000 },
			{ balanceType: BALANCE_TYPES.CANCELLED, balanceAmountArs: 0 },
			{ balanceType: BALANCE_TYPES.DEBTOR, balanceAmountArs: 50000 },
		]);

		expect(result.totalDebtors).toBe(150000);
		expect(result.debtorsCount).toBe(2);
		expect(result.totalCreditors).toBe(30000);
		expect(result.creditorsCount).toBe(1);
	});

	it('ignores cancelled balances', () => {
		const result = calculateBalanceStats([
			{ balanceType: BALANCE_TYPES.CANCELLED, balanceAmountArs: 99999 },
			{ balanceType: BALANCE_TYPES.CANCELLED, balanceAmountArs: 0 },
		]);

		expect(result.totalDebtors).toBe(0);
		expect(result.totalCreditors).toBe(0);
		expect(result.debtorsCount).toBe(0);
		expect(result.creditorsCount).toBe(0);
	});
});
