import { calculateBalanceSummary } from '@/helpers/balances/balance-calculations';

describe('calculateBalanceSummary', () => {
	it('returns zeros when no input is provided', () => {
		const result = calculateBalanceSummary({});

		expect(result).toEqual({
			budgetArsInitial: 0,
			budgetArsCurrent: 0,
			budgetUsd: 0,
			totalPaidArs: 0,
			totalPaidUsd: 0,
			remainingArs: 0,
			remainingUsd: 0,
			progressPercentage: 0,
			type: 'Cancelado',
		});
	});

	it('returns correct values for a debtor balance', () => {
		const result = calculateBalanceSummary({
			budgetAmountArs: 100000,
			budgetAmountUsd: 5000,
			budgetInitialArs: 100000,
			totalPaidArs: 30000,
			totalPaidUsd: 1500,
		});

		expect(result.budgetArsInitial).toBe(100000);
		expect(result.budgetArsCurrent).toBe(100000);
		expect(result.budgetUsd).toBe(5000);
		expect(result.totalPaidArs).toBe(30000);
		expect(result.totalPaidUsd).toBe(1500);
		expect(result.remainingArs).toBe(70000);
		expect(result.remainingUsd).toBe(3500);
		expect(result.progressPercentage).toBe(30);
		expect(result.type).toBe('Deudor');
	});

	it('returns creditor when remaining usd is negative', () => {
		const result = calculateBalanceSummary({
			budgetAmountArs: 100000,
			budgetAmountUsd: 5000,
			budgetInitialArs: 100000,
			totalPaidArs: 120000,
			totalPaidUsd: 6000,
		});

		expect(result.remainingArs).toBe(-20000);
		expect(result.remainingUsd).toBe(-1000);
		expect(result.type).toBe('Acreedor');
	});

	it('returns cancelado when remaining usd is exactly zero', () => {
		const result = calculateBalanceSummary({
			budgetAmountArs: 100000,
			budgetAmountUsd: 5000,
			budgetInitialArs: 100000,
			totalPaidArs: 100000,
			totalPaidUsd: 5000,
		});

		expect(result.remainingArs).toBe(0);
		expect(result.remainingUsd).toBe(0);
		expect(result.type).toBe('Cancelado');
	});

	it('caps progress percentage at 100', () => {
		const result = calculateBalanceSummary({
			budgetAmountArs: 50000,
			budgetAmountUsd: 2500,
			totalPaidArs: 99999,
			totalPaidUsd: 5000,
		});

		expect(result.progressPercentage).toBe(100);
	});

	it('handles null values safely', () => {
		const result = calculateBalanceSummary({
			budgetAmountArs: null,
			budgetAmountUsd: null,
			budgetInitialArs: null,
			totalPaidArs: null,
			totalPaidUsd: null,
		});

		expect(result.budgetArsInitial).toBe(0);
		expect(result.progressPercentage).toBe(0);
		expect(result.type).toBe('Cancelado');
	});

	it('uses budgetArsCurrent for progress when available instead of budgetInitialArs', () => {
		const result = calculateBalanceSummary({
			budgetAmountArs: 200000,
			budgetAmountUsd: 10000,
			budgetInitialArs: 100000,
			totalPaidArs: 50000,
			totalPaidUsd: 2500,
		});

		expect(result.progressPercentage).toBe(25);
	});

	it('uses budgetInitialArs for progress when budgetArsCurrent is zero', () => {
		const result = calculateBalanceSummary({
			budgetAmountArs: 0,
			budgetAmountUsd: 5000,
			budgetInitialArs: 100000,
			totalPaidArs: 50000,
			totalPaidUsd: 2500,
		});

		expect(result.progressPercentage).toBe(50);
	});
});
