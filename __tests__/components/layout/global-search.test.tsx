import { act, render, screen } from '@testing-library/react';
import { GlobalSearch } from '@/components/layout/global-search';

jest.mock('next/navigation', () => ({
	useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/search/use-global-search', () => ({
	useGlobalSearch: () => ({
		term: '',
		setTerm: jest.fn(),
		groups: [],
		isSearching: false,
		hasError: false,
		hasResults: false,
		isTermTooShort: true,
		reset: jest.fn(),
	}),
}));

describe('GlobalSearch shortcut', () => {
	test('a keydown with no key (a picked browser suggestion) does not break the page', () => {
		render(<GlobalSearch />);

		// Chrome fires this when a datalist or autofill suggestion is chosen.
		const event = new KeyboardEvent('keydown');
		Object.defineProperty(event, 'key', { value: undefined });

		expect(() => act(() => void window.dispatchEvent(event))).not.toThrow();
		expect(screen.queryByPlaceholderText('Buscar clientes, obras, insumos...')).toBeNull();
	});

	test('Cmd+K still opens the search', () => {
		render(<GlobalSearch />);

		act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true })));

		expect(screen.getByPlaceholderText('Buscar clientes, obras, insumos...')).toBeInTheDocument();
	});
});
