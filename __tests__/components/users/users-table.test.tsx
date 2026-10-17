import { render, screen, within } from '@testing-library/react';
import { UsersTable } from '@/components/business/users/users-table';

jest.mock('@/lib/utils', () => ({
	cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

jest.mock('@/components/ui/table', () => ({
	Table: ({ children }: any) => <table>{children}</table>,
	TableBody: ({ children }: any) => <tbody>{children}</tbody>,
	TableCell: ({ children }: any) => <td>{children}</td>,
	TableHead: ({ children }: any) => <th>{children}</th>,
	TableHeader: ({ children }: any) => <thead>{children}</thead>,
	TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, onValueChange, value, disabled }: any) => (
		<select
			data-testid="select-role"
			value={value}
			disabled={disabled}
			onChange={(e) => onValueChange?.(e.target.value)}
		>
			{children}
		</select>
	),
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value, disabled }: any) => (
		<option value={value} disabled={disabled}>
			{children}
		</option>
	),
	SelectTrigger: () => null,
	SelectValue: () => null,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, type, ...props }: any) => (
		<button type={type || 'button'} onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/label', () => ({
	Label: (props: any) => <label {...props} />,
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children }: any) => <div>{children}</div>,
	CardContent: ({ children }: any) => <div>{children}</div>,
}));

function baseProps(overrides: Partial<Parameters<typeof UsersTable>[0]> = {}) {
	return {
		users: [],
		loading: false,
		currentUser: { username: 'admin1', role: 'Admin' as const },
		isCurrentUser: (u: any) => u.username === 'admin1',
		onEdit: jest.fn(),
		onDelete: jest.fn(),
		onAdd: jest.fn(),
		onUpdateRole: jest.fn(),
		...overrides,
	};
}

describe('UsersTable', () => {
	it('shows Superadmin as the selected value for a plain Admin viewing a Superadmin user, and disables the select', async () => {
		render(
			<UsersTable
				{...baseProps({
					users: [{ uid_user: '1', username: 'super1', role: 'Superadmin' }] as any,
				})}
			/>
		);

		const selects = screen.getAllByTestId('select-role');
		for (const select of selects) {
			expect((select as HTMLSelectElement).value).toBe('Superadmin');
			expect(select).toBeDisabled();
			expect(within(select).getByText('Superadmin')).toBeInTheDocument();
		}
	});

	it('does not include Superadmin as an assignable option for non-Superadmin targets when caller is Admin', async () => {
		render(
			<UsersTable
				{...baseProps({
					users: [{ uid_user: '1', username: 'taller1', role: 'Taller' }] as any,
				})}
			/>
		);

		const selects = screen.getAllByTestId('select-role');
		for (const select of selects) {
			expect(select).not.toBeDisabled();
			expect(within(select).queryByText('Superadmin')).not.toBeInTheDocument();
		}
	});

	it('allows a Superadmin caller to assign Superadmin and keeps the select enabled', async () => {
		render(
			<UsersTable
				{...baseProps({
					currentUser: { username: 'super0', role: 'Superadmin' as const },
					users: [{ uid_user: '1', username: 'super1', role: 'Superadmin' }] as any,
				})}
			/>
		);

		const selects = screen.getAllByTestId('select-role');
		for (const select of selects) {
			expect(select).not.toBeDisabled();
			expect((select as HTMLSelectElement).value).toBe('Superadmin');
		}
	});
});
