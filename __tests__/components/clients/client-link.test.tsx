import { fireEvent, render, screen } from '@testing-library/react';
import { ClientLink } from '@/components/business/clients/client-link';
import { useAuth } from '@/components/provider/auth-provider';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

const loginAs = (user: { role: string; views?: string[] }) =>
	(useAuth as jest.Mock).mockReturnValue({ user });

describe('ClientLink', () => {
	it('links to the client on the requested tab', () => {
		loginAs({ role: 'Admin' });
		render(
			<ClientLink clientId={5} tab="balances">
				Perez Ana
			</ClientLink>
		);

		expect(screen.getByRole('link', { name: 'Perez Ana' })).toHaveAttribute(
			'href',
			'/clients?clientId=5&tab=balances'
		);
	});

	it('does not trigger the click of the row it sits in', () => {
		loginAs({ role: 'Admin' });
		const onRowClick = jest.fn();
		render(
			<div onClick={onRowClick}>
				<ClientLink clientId={5}>Perez Ana</ClientLink>
			</div>
		);

		fireEvent.click(screen.getByRole('link', { name: 'Perez Ana' }));

		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('shows plain text when there is no client', () => {
		loginAs({ role: 'Admin' });
		render(<ClientLink clientId={null}>Sin cliente</ClientLink>);

		expect(screen.getByText('Sin cliente')).toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('shows plain text to users who cannot see clients', () => {
		loginAs({ role: 'Taller', views: ['panel', 'cash-flow'] });
		render(<ClientLink clientId={5}>Perez Ana</ClientLink>);

		expect(screen.getByText('Perez Ana')).toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});
});
