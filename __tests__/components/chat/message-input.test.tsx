import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from '@/components/business/chat/message-input';
import { MessageWithUser } from '@/lib/chat/chat-types';

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: ({ value, onChange, onKeyDown, placeholder, ...props }: any) => (
		<input
			value={value}
			onChange={onChange}
			onKeyDown={onKeyDown}
			placeholder={placeholder}
			{...props}
		/>
	),
}));

jest.mock('@/components/business/chat/quote-message', () => ({
	QuoteMessage: ({ message, onCancel }: any) => (
		<div data-testid="quote-message">
			<span>{message.content}</span>
			{onCancel && <button onClick={onCancel}>Cancel quote</button>}
		</div>
	),
}));

const replyingTo: MessageWithUser = {
	id: 10,
	created_at: '2024-01-01T00:00:00Z',
	content: 'Original message',
	edited_at: null,
	deleted_at: null,
	user_id: 'user-1',
	channel_id: 1,
	reply_to: null,
	users: { uid_user: 'user-1', username: 'juan', name: 'Juan', last_name: 'Pérez', role: 'Admin' },
};

describe('MessageInput', () => {
	const defaultProps = {
		newMessage: '',
		sending: false,
		replyingTo: null,
		onMessageChange: jest.fn(),
		onSendMessage: jest.fn(),
		onCancelReply: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the input with placeholder', () => {
		render(<MessageInput {...defaultProps} />);
		expect(screen.getByPlaceholderText('Escribe un mensaje...')).toBeInTheDocument();
	});

	it('displays the current message value', () => {
		render(<MessageInput {...defaultProps} newMessage="Hello" />);
		expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
	});

	it('calls onMessageChange when input changes', () => {
		render(<MessageInput {...defaultProps} />);
		fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'Hi' } });
		expect(defaultProps.onMessageChange).toHaveBeenCalledWith('Hi');
	});

	it('calls onSendMessage when Enter is pressed', () => {
		render(<MessageInput {...defaultProps} newMessage="Hello" />);
		fireEvent.keyDown(screen.getByDisplayValue('Hello'), { key: 'Enter' });
		expect(defaultProps.onSendMessage).toHaveBeenCalledTimes(1);
	});

	it('does not call onSendMessage when Enter is pressed with empty message', () => {
		render(<MessageInput {...defaultProps} newMessage="" />);
		fireEvent.keyDown(screen.getByDisplayValue(''), { key: 'Enter' });
		expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
	});

	it('does not call onSendMessage when Enter is pressed while sending', () => {
		render(<MessageInput {...defaultProps} newMessage="Hello" sending />);
		fireEvent.keyDown(screen.getByDisplayValue('Hello'), { key: 'Enter' });
		expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
	});

	it('does not call onSendMessage when other keys are pressed', () => {
		render(<MessageInput {...defaultProps} newMessage="Hello" />);
		fireEvent.keyDown(screen.getByDisplayValue('Hello'), { key: 'a' });
		expect(defaultProps.onSendMessage).not.toHaveBeenCalled();
	});

	it('disables send button when message is empty', () => {
		render(<MessageInput {...defaultProps} />);
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('disables send button when sending is true', () => {
		render(<MessageInput {...defaultProps} newMessage="Hello" sending />);
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('enables send button when message has content and not sending', () => {
		render(<MessageInput {...defaultProps} newMessage="Hello" />);
		expect(screen.getByRole('button')).not.toBeDisabled();
	});

	it('shows reply quote when replyingTo is set', () => {
		render(<MessageInput {...defaultProps} replyingTo={replyingTo} />);
		expect(screen.getByTestId('quote-message')).toBeInTheDocument();
		expect(screen.getByText('Original message')).toBeInTheDocument();
	});

	it('does not show reply quote when replyingTo is null', () => {
		render(<MessageInput {...defaultProps} />);
		expect(screen.queryByTestId('quote-message')).not.toBeInTheDocument();
	});

	it('calls onCancelReply when cancel quote is clicked', () => {
		render(<MessageInput {...defaultProps} replyingTo={replyingTo} />);
		fireEvent.click(screen.getByText('Cancel quote'));
		expect(defaultProps.onCancelReply).toHaveBeenCalledTimes(1);
	});
});
