import { getSupplierAccountDetail } from '@/lib/suppliers/account-summary';
import { listPurchasesSuppliers } from '@/lib/suppliers/purchases-suppliers';
import { listPaymentsSuppliersByPurchaseIds } from '@/lib/suppliers/payments-suppliers';

jest.mock('@/lib/suppliers/purchases-suppliers', () => ({
	listPurchasesSuppliers: jest.fn(),
}));

jest.mock('@/lib/suppliers/payments-suppliers', () => ({
	listPaymentsSuppliersByPurchaseIds: jest.fn(),
}));

const PURCHASE = {
	id: 11,
	created_at: '2026-01-10T00:00:00.000Z',
	supplier_id: 3,
	notes: null,
};

function payment(id: number, purchaseSupplierId: number, amount_ars: number) {
	return {
		id,
		created_at: '2026-01-20T00:00:00.000Z',
		amount_ars,
		bank_account_id: null,
		payment_method_id: null,
		purchase_supplier_id: purchaseSupplierId,
		notes: null,
	};
}

function setup(amount_ars: number, payments: ReturnType<typeof payment>[]) {
	(listPurchasesSuppliers as jest.Mock).mockResolvedValue({
		data: [{ ...PURCHASE, amount_ars }],
		error: null,
	});
	(listPaymentsSuppliersByPurchaseIds as jest.Mock).mockResolvedValue({
		data: payments,
		error: null,
	});
}

describe('getSupplierAccountDetail: balance rounding', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('rounds a payment total split across floats (0.1 + 0.1 + 0.1) so it equals the purchase amount exactly', async () => {
		setup(0.3, [payment(1, 11, 0.1), payment(2, 11, 0.1), payment(3, 11, 0.1)]);

		const { data } = await getSupplierAccountDetail(3);

		expect(data?.purchases[0].totalPaidArs).toBe(0.3);
		expect(data?.purchases[0].balanceArs).toBe(0);
		expect(data?.totalPurchasesArs).toBe(0.3);
		expect(data?.totalPaymentsArs).toBe(0.3);
		expect(data?.balanceArs).toBe(0);
	});

	it('leaves an unpaid purchase balance equal to the full amount', async () => {
		setup(1000, []);

		const { data } = await getSupplierAccountDetail(3);

		expect(data?.purchases[0].totalPaidArs).toBe(0);
		expect(data?.purchases[0].balanceArs).toBe(1000);
	});

	it('computes a partial balance for a payment smaller than the purchase amount', async () => {
		setup(1000, [payment(1, 11, 400)]);

		const { data } = await getSupplierAccountDetail(3);

		expect(data?.purchases[0].totalPaidArs).toBe(400);
		expect(data?.purchases[0].balanceArs).toBe(600);
	});

	it('rounds an overpayment to a clean negative balance', async () => {
		setup(100, [payment(1, 11, 70), payment(2, 11, 80)]);

		const { data } = await getSupplierAccountDetail(3);

		expect(data?.purchases[0].totalPaidArs).toBe(150);
		expect(data?.purchases[0].balanceArs).toBe(-50);
		expect(data?.balanceArs).toBe(-50);
	});
});
