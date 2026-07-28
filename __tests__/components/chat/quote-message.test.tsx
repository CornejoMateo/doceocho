import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteMessage } from '@/components/business/chat/quote-message';
import { MessageWithUser } from '@/lib/chat/chat-types';

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

const baseMessage: MessageWithUser = {
	id: 1,
	created_at: '2024-01-01T00:00:00Z',
	content: 'Hello world',
	edited_at: null,
	deleted_at: null,
	user_id: 'user-1',
	channel_id: 1,
	reply_to: null,
	users: {
		uid_user: 'user-1',
		username: 'juan',
		name: 'Juan',
		last_name: 'Pérez',
		role: 'Admin',
	},
};

describe('QuoteMessage', () => {
	it('renders the user name', () => {
		render(<QuoteMessage message={baseMessage} />);
		expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
	});

	it('renders the message content', () => {
		render(<QuoteMessage message={baseMessage} />);
		expect(screen.getByText('Hello world')).toBeInTheDocument();
	});

	it('renders username fallback when name is null', () => {
		const msg = {
			...baseMessage,
			users: { ...baseMessage.users!, name: null },
		};
		render(<QuoteMessage message={msg} />);
		expect(screen.getByText(/juan/)).toBeInTheDocument();
	});

	it('renders "Usuario" when users is null', () => {
		const msg = { ...baseMessage, users: null };
		render(<QuoteMessage message={msg} />);
		expect(screen.getByText('Usuario')).toBeInTheDocument();
	});

	it('renders full content (CSS truncates visually)', () => {
		const msg = { ...baseMessage, content: 'A'.repeat(60) };
		render(<QuoteMessage message={msg} />);
		expect(screen.getByText('A'.repeat(60))).toBeInTheDocument();
	});

	it('does not truncate short content', () => {
		const msg = { ...baseMessage, content: 'A'.repeat(50) };
		render(<QuoteMessage message={msg} />);
		expect(screen.getByText('A'.repeat(50))).toBeInTheDocument();
	});

	it('shows deleted message text when message is deleted', () => {
		const msg = { ...baseMessage, deleted_at: '2024-01-02T00:00:00Z' };
		render(<QuoteMessage message={msg} />);
		expect(screen.getByText('Este mensaje fue eliminado')).toBeInTheDocument();
	});

	it('does not show deleted text when message is not deleted', () => {
		render(<QuoteMessage message={baseMessage} />);
		expect(screen.queryByText('Este mensaje fue eliminado')).not.toBeInTheDocument();
	});

	it('shows cancel button by default', () => {
		const onCancel = jest.fn();
		render(<QuoteMessage message={baseMessage} onCancel={onCancel} />);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('hides cancel button when showCancel is false', () => {
		render(<QuoteMessage message={baseMessage} showCancel={false} />);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('calls onCancel when cancel button is clicked', () => {
		const onCancel = jest.fn();
		render(<QuoteMessage message={baseMessage} onCancel={onCancel} />);
		fireEvent.click(screen.getByRole('button'));
		expect(onCancel).toHaveBeenCalledTimes(1);
	});
});
