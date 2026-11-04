import { getClientHref } from '@/helpers/clients/client-href';
import { isClientTab } from '@/constants/clients/client-tabs';

describe('getClientHref', () => {
	it('opens the client on its default tab', () => {
		expect(getClientHref(7)).toBe('/clients?clientId=7');
	});

	it('opens the client on the given tab', () => {
		expect(getClientHref(7, 'balances')).toBe('/clients?clientId=7&tab=balances');
	});
});

describe('isClientTab', () => {
	it('accepts only the tabs the client detail has', () => {
		expect(isClientTab('budgets')).toBe(true);
		expect(isClientTab('payments')).toBe(false);
		expect(isClientTab(null)).toBe(false);
	});
});
