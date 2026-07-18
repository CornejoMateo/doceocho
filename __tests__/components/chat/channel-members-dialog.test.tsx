import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChannelMembersDialog } from '@/components/business/chat/channel-members-dialog';
import { ChannelWithLastMessage } from '@/lib/chat/chat-types';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
	AlertDialog: ({ children, open }: any) =>
		open ? <div data-testid="alert-dialog">{children}</div> : null,
	AlertDialogContent: ({ children }: any) => <div>{children}</div>,
	AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: any) => <h3>{children}</h3>,
	AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
	AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
	AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children }: any) => <label>{children}</label>,
}));

jest.mock('@/lib/chat/channel-members', () => ({
	getAvailableUsersAction: jest.fn(),
	addMemberToChannelAction: jest.fn(),
	removeMemberFromChannelAction: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('lucide-react', () => ({
	UserPlus: (props: any) => <svg data-testid="icon-user-plus" {...props} />,
	UserMinus: (props: any) => <svg data-testid="icon-user-minus" {...props} />,
	Users: (props: any) => <svg data-testid="icon-users" {...props} />,
}));

import { getAvailableUsersAction, addMemberToChannelAction } from '@/lib/chat/channel-members';
import { toast } from '@/components/ui/use-toast';

const channel: ChannelWithLastMessage = {
	id: 1,
	name: 'General',
	description: null,
	last_message_id: null,
};

const members = [
	{
		id: 1,
		user_id: 'user-1',
		channel_id: 1,
		joined_at: '2024-01-01',
		users: {
			uid_user: 'user-1',
			username: 'juan',
			name: 'Juan',
			last_name: 'Pérez',
			role: 'Admin',
		},
	},
	{
		id: 2,
		user_id: 'user-2',
		channel_id: 1,
		joined_at: '2024-01-02',
		users: {
			uid_user: 'user-2',
			username: 'maria',
			name: 'María',
			last_name: 'López',
			role: 'Colocador',
		},
	},
];

const availableUsers = [
	{ uid_user: 'user-1', username: 'juan', role: 'Admin' },
	{ uid_user: 'user-2', username: 'maria', role: 'Colocador' },
	{ uid_user: 'user-3', username: 'pedro', role: 'Taller' },
];

describe('ChannelMembersDialog', () => {
	const defaultProps = {
		open: true,
		onOpenChange: jest.fn(),
		channel,
		members,
		onMembersUpdated: jest.fn(),
		currentUserRole: 'Admin',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(getAvailableUsersAction as jest.Mock).mockResolvedValue({
			success: true,
			data: availableUsers,
		});
	});

	it('renders when open', async () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
	});

	it('does not render when closed', () => {
		render(<ChannelMembersDialog {...defaultProps} open={false} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders the title', () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		expect(screen.getByText('Miembros del canal')).toBeInTheDocument();
	});

	it('renders channel name and member count', () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		expect(screen.getByText(/General - 2 miembros/)).toBeInTheDocument();
	});

	it('renders member usernames', async () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByText('juan')).toBeInTheDocument();
			expect(screen.getByText('maria')).toBeInTheDocument();
		});
	});

	it('renders member roles', async () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		await waitFor(() => {
			const roleTexts = screen.getAllByText('Admin');
			expect(roleTexts.length).toBeGreaterThanOrEqual(1);
		});
	});

	it('loads available users on open', () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		expect(getAvailableUsersAction).toHaveBeenCalled();
	});

	it('shows add member form for admin', async () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		await waitFor(() => {
			expect(screen.getByText('Agregar miembro')).toBeInTheDocument();
		});
	});

	it('hides add member form for non-admin', () => {
		render(<ChannelMembersDialog {...defaultProps} currentUserRole="Colocador" />);
		expect(screen.queryByText('Agregar miembro')).not.toBeInTheDocument();
	});

	it('shows remove buttons for admin', async () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		await waitFor(() => {
			const removeButtons = screen.getAllByTestId('icon-user-minus');
			expect(removeButtons.length).toBe(2);
		});
	});

	it('hides remove buttons for non-admin', () => {
		render(<ChannelMembersDialog {...defaultProps} currentUserRole="Colocador" />);
		expect(screen.queryByTestId('icon-user-minus')).not.toBeInTheDocument();
	});

	it('shows empty message when no members', async () => {
		render(<ChannelMembersDialog {...defaultProps} members={[]} />);
		await waitFor(() => {
			expect(screen.getByText('No hay miembros en este canal')).toBeInTheDocument();
		});
	});

	it('calls addMemberToChannelAction when adding a member', async () => {
		(addMemberToChannelAction as jest.Mock).mockResolvedValue({ success: true });
		render(<ChannelMembersDialog {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText('juan')).toBeInTheDocument();
		});

		const select = screen.getByDisplayValue('Seleccionar usuario');
		fireEvent.change(select, { target: { value: 'user-3' } });

		const addButton = screen.getByTestId('icon-user-plus').closest('button')!;
		fireEvent.click(addButton);

		await waitFor(() => {
			expect(addMemberToChannelAction).toHaveBeenCalledWith(1, 'user-3');
		});
	});

	it('calls onMembersUpdated after successful add', async () => {
		(addMemberToChannelAction as jest.Mock).mockResolvedValue({ error: null });
		render(<ChannelMembersDialog {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText('juan')).toBeInTheDocument();
		});

		const select = screen.getByDisplayValue('Seleccionar usuario');
		fireEvent.change(select, { target: { value: 'user-3' } });

		const addButton = screen.getByTestId('icon-user-plus').closest('button')!;
		fireEvent.click(addButton);

		await waitFor(() => {
			expect(defaultProps.onMembersUpdated).toHaveBeenCalled();
		});
	});

	it('shows toast on successful add', async () => {
		(addMemberToChannelAction as jest.Mock).mockResolvedValue({ error: null });
		render(<ChannelMembersDialog {...defaultProps} />);

		await waitFor(() => {
			expect(screen.getByText('juan')).toBeInTheDocument();
		});

		const select = screen.getByDisplayValue('Seleccionar usuario');
		fireEvent.change(select, { target: { value: 'user-3' } });

		const addButton = screen.getByTestId('icon-user-plus').closest('button')!;
		fireEvent.click(addButton);

		await waitFor(() => {
			expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Miembro agregado' }));
		});
	});

	it('filters out existing members from available users', async () => {
		render(<ChannelMembersDialog {...defaultProps} />);
		await waitFor(() => {
			const select = screen.getByDisplayValue('Seleccionar usuario');
			const options = select.querySelectorAll('option');
			expect(options.length).toBe(2);
		});
	});
});
