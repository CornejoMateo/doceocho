import { renderHook, waitFor } from '@testing-library/react';
import { useSupplierPaymentOptions } from '@/hooks/suppliers/use-supplier-payment-options';
import { listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';
import { listCategories } from '@/lib/categories/categories';
import { listWorks } from '@/lib/works/works';
import { listVoucherTypes } from '@/lib/voucher-types/voucher-types';

jest.mock('@/lib/cash-flow/cash-flow', () => ({ listBankAccounts: jest.fn() }));
jest.mock('@/lib/payment-methods/payment-methods', () => ({ listPaymentMethods: jest.fn() }));
jest.mock('@/lib/categories/categories', () => ({ listCategories: jest.fn() }));
jest.mock('@/lib/works/works', () => ({ listWorks: jest.fn() }));
jest.mock('@/lib/voucher-types/voucher-types', () => ({ listVoucherTypes: jest.fn() }));

const activeAccount = { id: 1, name: 'Caja', bank: 'Galicia', is_active: true };
const inactiveAccount = { id: 2, name: 'Vieja', bank: 'BBVA', is_active: false };
const activeMethod = { id: 1, name: 'Transferencia', is_active: true };
const activeExpenseCategory = { id: 1, name: 'Materiales', kind: 'expense', is_active: true };
const inactivePaymentCategory = { id: 2, name: 'Viejo', kind: 'payment', is_active: false };
const activeWork = { id: 1, name: 'Casa Norte' };
const activeVoucherType = { id: 1, name: 'Factura A', is_active: true };
const inactiveVoucherType = { id: 2, name: 'Vieja', is_active: false };

describe('useSupplierPaymentOptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listBankAccounts as jest.Mock).mockResolvedValue({
			data: [activeAccount, inactiveAccount],
			error: null,
		});
		(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [activeMethod], error: null });
		(listCategories as jest.Mock).mockImplementation(async (kind: string) =>
			kind === 'expense'
				? { data: [activeExpenseCategory], error: null }
				: { data: [inactivePaymentCategory], error: null }
		);
		(listWorks as jest.Mock).mockResolvedValue({ data: [activeWork], error: null });
		(listVoucherTypes as jest.Mock).mockResolvedValue({
			data: [activeVoucherType, inactiveVoucherType],
			error: null,
		});
	});

	it('does not fetch while closed', () => {
		renderHook(() => useSupplierPaymentOptions(false));

		expect(listBankAccounts).not.toHaveBeenCalled();
		expect(listPaymentMethods).not.toHaveBeenCalled();
		expect(listCategories).not.toHaveBeenCalled();
		expect(listWorks).not.toHaveBeenCalled();
		expect(listVoucherTypes).not.toHaveBeenCalled();
	});

	it('loads once when opened and filters out inactive options', async () => {
		const { result } = renderHook(() => useSupplierPaymentOptions(true));

		await waitFor(() => expect(result.current.activeBankAccounts).toEqual([activeAccount]));
		expect(result.current.activePaymentMethods).toEqual([activeMethod]);
		// Full (unfiltered) lists are exposed too, so an edit form can keep a deactivated
		// option visible with withInactiveSelected (same pattern as income-expense-form-dialog.tsx).
		expect(result.current.bankAccounts).toEqual([activeAccount, inactiveAccount]);
		expect(result.current.paymentMethods).toEqual([activeMethod]);
		expect(result.current.bankAccountById.get(2)).toEqual(inactiveAccount);
		expect(result.current.activeExpenseCategories).toEqual([activeExpenseCategory]);
		expect(result.current.activePaymentCategories).toEqual([]);
		expect(result.current.paymentCategoryById.get(2)).toEqual(inactivePaymentCategory);
		expect(result.current.works).toEqual([activeWork]);
		expect(result.current.activeVoucherTypes).toEqual([activeVoucherType]);
	});

	it('does not refetch on a rerender while staying open', async () => {
		const { rerender } = renderHook(() => useSupplierPaymentOptions(true));
		await waitFor(() => expect(listBankAccounts).toHaveBeenCalledTimes(1));

		rerender();

		expect(listBankAccounts).toHaveBeenCalledTimes(1);
	});
});
