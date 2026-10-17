import { render, screen, within } from '@testing-library/react';
import { UsersDialogForm } from '@/components/business/users/users-dialog-form';

jest.mock('@/components/ui/dialog', () => ({
	DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, type, ...props }: any) => (
		<button type={type || 'button'} onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
	Label: (props: any) => <label {...props} />,
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

function baseProps(overrides: Partial<Parameters<typeof UsersDialogForm>[0]> = {}) {
	return {
		editingUser: null,
		formData: { username: '', password: '', role: 'Taller', name: '', last_name: '' },
		setFormData: jest.fn(),
		saving: false,
		showPassword: false,
		setShowPassword: jest.fn(),
		handleSave: jest.fn(),
		onCancel: jest.fn(),
		callerRole: 'Admin' as const,
		...overrides,
	};
}

describe('UsersDialogForm', () => {
	it('displays Superadmin as the selected value when a plain Admin edits a Superadmin user, and disables the select', () => {
		render(
			<UsersDialogForm
				{...baseProps({
					editingUser: { uid_user: '1', username: 'super1', role: 'Superadmin' } as any,
					formData: {
						username: 'super1',
						password: '',
						role: 'Superadmin',
						name: '',
						last_name: '',
					},
				})}
			/>
		);

		const select = screen.getByTestId('select-role') as HTMLSelectElement;
		expect(select.value).toBe('Superadmin');
		expect(select).toBeDisabled();
		expect(within(select).getByText('Superadmin')).toBeInTheDocument();
	});

	it('does not offer Superadmin as assignable for a plain Admin editing a non-Superadmin user', () => {
		render(
			<UsersDialogForm
				{...baseProps({
					editingUser: { uid_user: '1', username: 'taller1', role: 'Taller' } as any,
					formData: { username: 'taller1', password: '', role: 'Taller', name: '', last_name: '' },
				})}
			/>
		);

		const select = screen.getByTestId('select-role') as HTMLSelectElement;
		expect(select).not.toBeDisabled();
		expect(within(select).queryByText('Superadmin')).not.toBeInTheDocument();
	});

	it('allows a Superadmin caller to assign Superadmin and keeps the select enabled', () => {
		render(
			<UsersDialogForm
				{...baseProps({
					callerRole: 'Superadmin' as const,
					editingUser: { uid_user: '1', username: 'super1', role: 'Superadmin' } as any,
					formData: {
						username: 'super1',
						password: '',
						role: 'Superadmin',
						name: '',
						last_name: '',
					},
				})}
			/>
		);

		const select = screen.getByTestId('select-role') as HTMLSelectElement;
		expect(select).not.toBeDisabled();
		expect(select.value).toBe('Superadmin');
	});
});
