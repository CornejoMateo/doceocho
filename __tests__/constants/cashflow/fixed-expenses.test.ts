import { IVA_RATES, computeIvaAndTotal } from '@/constants/cashflow/fixed-expenses';

describe('computeIvaAndTotal', () => {
	it('computes iva and total at 21%', () => {
		expect(computeIvaAndTotal(1000, 21)).toEqual({ ivaAmount: 210, totalAmount: 1210 });
	});

	it('computes iva and total at 10.5%, rounded to 2 decimals', () => {
		expect(computeIvaAndTotal(100, 10.5)).toEqual({ ivaAmount: 10.5, totalAmount: 110.5 });
	});

	it('returns zero iva when the rate is 0', () => {
		expect(computeIvaAndTotal(500, 0)).toEqual({ ivaAmount: 0, totalAmount: 500 });
	});

	it('exposes the allowed IVA rates', () => {
		expect(IVA_RATES).toEqual([0, 10.5, 21, 27]);
	});
});
