import { renderHook, waitFor } from '@testing-library/react';
import { useSupplierPaymentOptions } from '@/hooks/suppliers/use-supplier-payment-options';
import { listBankAccounts } from '@/lib/cash-flow/cash-flow';
import { listPaymentMethods } from '@/lib/payment-methods/payment-methods';

jest.mock('@/lib/cash-flow/cash-flow', () => ({ listBankAccounts: jest.fn() }));
jest.mock('@/lib/payment-methods/payment-methods', () => ({ listPaymentMethods: jest.fn() }));

const activeAccount = { id: 1, name: 'Caja', bank: 'Galicia', is_active: true };
const inactiveAccount = { id: 2, name: 'Vieja', bank: 'BBVA', is_active: false };
const activeMethod = { id: 1, name: 'Transferencia', is_active: true };

describe('useSupplierPaymentOptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listBankAccounts as jest.Mock).mockResolvedValue({
			data: [activeAccount, inactiveAccount],
			error: null,
		});
		(listPaymentMethods as jest.Mock).mockResolvedValue({ data: [activeMethod], error: null });
	});

	it('does not fetch while closed', () => {
		renderHook(() => useSupplierPaymentOptions(false));

		expect(listBankAccounts).not.toHaveBeenCalled();
		expect(listPaymentMethods).not.toHaveBeenCalled();
	});

	it('loads once when opened and filters out inactive options', async () => {
		const { result } = renderHook(() => useSupplierPaymentOptions(true));

		await waitFor(() => expect(result.current.activeBankAccounts).toEqual([activeAccount]));
		expect(result.current.activePaymentMethods).toEqual([activeMethod]);
		expect(result.current.bankAccountById.get(2)).toEqual(inactiveAccount);
	});

	it('does not refetch on a rerender while staying open', async () => {
		const { rerender } = renderHook(() => useSupplierPaymentOptions(true));
		await waitFor(() => expect(listBankAccounts).toHaveBeenCalledTimes(1));

		rerender();

		expect(listBankAccounts).toHaveBeenCalledTimes(1);
	});
});
