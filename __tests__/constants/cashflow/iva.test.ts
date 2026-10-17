import { IVA_RATES, computeIvaAndTotal } from '@/constants/cashflow/iva';

describe('computeIvaAndTotal', () => {
	it('computes iva and total at 21%', () => {
		expect(computeIvaAndTotal(1000, 21)).toEqual({ ivaAmount: 210, totalAmount: 1210 });
	});

	it('computes iva and total at 10.5%, rounded to 2 decimals', () => {
		expect(computeIvaAndTotal(100, 10.5)).toEqual({ ivaAmount: 10.5, totalAmount: 110.5 });
	});

	it('computes iva and total at 27%', () => {
		expect(computeIvaAndTotal(100, 27)).toEqual({ ivaAmount: 27, totalAmount: 127 });
	});

	it('returns zero iva when the rate is 0', () => {
		expect(computeIvaAndTotal(500, 0)).toEqual({ ivaAmount: 0, totalAmount: 500 });
	});

	it('returns zero amounts when net is 0', () => {
		expect(computeIvaAndTotal(0, 21)).toEqual({ ivaAmount: 0, totalAmount: 0 });
	});

	it('rounds a repeating-decimal iva to the nearest cent', () => {
		// 33.33 * 0.21 = 6.9993 -> rounds to 7
		expect(computeIvaAndTotal(33.33, 21)).toEqual({ ivaAmount: 7, totalAmount: 40.33 });
	});

	it('rounds small cent amounts instead of truncating to zero', () => {
		// 0.01 * 0.21 = 0.0021 -> rounds to 0
		expect(computeIvaAndTotal(0.01, 21)).toEqual({ ivaAmount: 0, totalAmount: 0.01 });
	});

	it('supports negative net amounts (e.g. credit notes)', () => {
		expect(computeIvaAndTotal(-50, 21)).toEqual({ ivaAmount: -10.5, totalAmount: -60.5 });
	});

	it('avoids floating point drift on exact-cent inputs', () => {
		// 10 * 0.105 would be 1.0499999999999998 without the EPSILON correction
		expect(computeIvaAndTotal(10, 10.5)).toEqual({ ivaAmount: 1.05, totalAmount: 11.05 });
	});

	it('exposes the allowed IVA rates in ascending order', () => {
		expect(IVA_RATES).toEqual([0, 10.5, 21, 27]);
	});
});
