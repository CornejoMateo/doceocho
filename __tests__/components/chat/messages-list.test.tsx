import { render, screen, fireEvent } from '@testing-library/react';
import { MessagesList } from '@/components/business/chat/messages-list';
import { MessageWithUser } from '@/lib/chat/chat-types';
import { CHAT_CONSTANTS } from '@/constants/chat/chat.constants';

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: ({ value, onChange, onKeyDown, autoFocus, ...props }: any) => (
		<input
			value={value}
			onChange={onChange}
			onKeyDown={onKeyDown}
			autoFocus={autoFocus}
			{...props}
		/>
	),
}));

jest.mock('@/components/business/chat/quote-message', () => ({
	QuoteMessage: ({ message }: any) => <div data-testid="quote-message">{message.content}</div>,
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAtChat: (d: any) => d || 'no date',
}));

jest.mock('lucide-react', () => ({
	Search: (props: any) => <svg data-testid="icon-search" {...props} />,
	MessageSquare: (props: any) => <svg data-testid="icon-message-square" {...props} />,
	Edit2: (props: any) => <svg data-testid="icon-edit" {...props} />,
	Trash2: (props: any) => <svg data-testid="icon-trash" {...props} />,
	MessageCircle: (props: any) => <svg data-testid="icon-message-circle" {...props} />,
}));

const otherUser = {
	uid_user: 'user-2',
	username: 'maria',
	name: 'María',
	last_name: 'López',
	role: 'Colocador',
};

const ownUser = {
	uid_user: 'user-1',
	username: 'juan',
	name: 'Juan',
	last_name: 'Pérez',
	role: 'Admin',
};

const baseMessage: MessageWithUser = {
	id: 1,
	created_at: '2024-01-01T00:00:00Z',
	content: 'Hello',
	edited_at: null,
	deleted_at: null,
	user_id: 'user-2',
	channel_id: 1,
	reply_to: null,
	users: otherUser,
};

const ownMessage: MessageWithUser = {
	...baseMessage,
	id: 2,
	content: 'My message',
	user_id: 'user-1',
	users: ownUser,
};

describe('MessagesList', () => {
	const defaultProps = {
		filteredMessages: [],
		searchTerm: '',
		isFiltering: false,
		currentUserId: 'user-1',
		editingMessage: null,
		messagesLoading: false,
		hasMore: false,
		loadingMore: false,
		onLoadMore: jest.fn(),
		onEditMessage: jest.fn(),
		onDeleteMessage: jest.fn(),
		onSetEditingMessage: jest.fn(),
		onReplyTo: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows loading state', () => {
		render(<MessagesList {...defaultProps} messagesLoading />);
		expect(screen.getByText('Cargando mensajes...')).toBeInTheDocument();
	});

	it('shows empty state when no messages and no search', () => {
		render(<MessagesList {...defaultProps} />);
		expect(screen.getByText(CHAT_CONSTANTS.MESSAGES.NO_MESSAGES)).toBeInTheDocument();
	});

	it('shows search empty state when no results', () => {
		render(<MessagesList {...defaultProps} searchTerm="xyz" isFiltering />);
		expect(screen.getByText(CHAT_CONSTANTS.MESSAGES.NO_SEARCH_RESULTS('xyz'))).toBeInTheDocument();
	});

	it('renders messages', () => {
		render(<MessagesList {...defaultProps} filteredMessages={[baseMessage]} />);
		expect(screen.getByText('Hello')).toBeInTheDocument();
	});

	it('shows other user name for other users messages', () => {
		render(<MessagesList {...defaultProps} filteredMessages={[baseMessage]} />);
		expect(screen.getByText('María López')).toBeInTheDocument();
	});

	it('does not show user name for own messages', () => {
		render(<MessagesList {...defaultProps} filteredMessages={[ownMessage]} />);
		expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
	});

	it('shows deleted message text', () => {
		const deleted = { ...baseMessage, deleted_at: '2024-01-02T00:00:00Z' };
		render(<MessagesList {...defaultProps} filteredMessages={[deleted]} />);
		expect(screen.getByText(CHAT_CONSTANTS.MESSAGES.MESSAGE_DELETED)).toBeInTheDocument();
	});

	it('shows edited indicator', () => {
		const edited = { ...baseMessage, edited_at: '2024-01-02T00:00:00Z' };
		render(<MessagesList {...defaultProps} filteredMessages={[edited]} />);
		expect(screen.getByText(new RegExp(CHAT_CONSTANTS.MESSAGES.EDITED))).toBeInTheDocument();
	});

	it('shows edit and delete buttons for own messages', () => {
		render(<MessagesList {...defaultProps} filteredMessages={[ownMessage]} />);
		expect(screen.getByTestId('icon-edit')).toBeInTheDocument();
		expect(screen.getByTestId('icon-trash')).toBeInTheDocument();
	});

	it('calls onReplyTo when reply button is clicked', () => {
		render(<MessagesList {...defaultProps} filteredMessages={[baseMessage]} />);
		fireEvent.click(screen.getByTestId('icon-message-circle'));
		expect(defaultProps.onReplyTo).toHaveBeenCalledWith(baseMessage);
	});

	it('shows loading indicator when loadingMore', () => {
		render(<MessagesList {...defaultProps} filteredMessages={[baseMessage]} hasMore loadingMore />);
		expect(screen.getByText('Cargando mensajes anteriores...')).toBeInTheDocument();
	});

	it('shows search results count in footer', () => {
		render(
			<MessagesList
				{...defaultProps}
				filteredMessages={[baseMessage]}
				searchTerm="test"
				isFiltering
			/>
		);
		expect(screen.getByText(/1 mensaje encontrado/)).toBeInTheDocument();
	});

	it('enters editing mode when edit button is clicked', () => {
		render(<MessagesList {...defaultProps} filteredMessages={[ownMessage]} />);
		const editBtn = screen.getByTestId('icon-edit');
		fireEvent.click(editBtn);
		expect(defaultProps.onSetEditingMessage).toHaveBeenCalledWith({
			id: ownMessage.id,
			content: ownMessage.content,
		});
	});

	it('calls onDeleteMessage when delete button is clicked', () => {
		render(<MessagesList {...defaultProps} filteredMessages={[ownMessage]} />);
		const deleteBtn = screen.getByTestId('icon-trash');
		fireEvent.click(deleteBtn);
		expect(defaultProps.onDeleteMessage).toHaveBeenCalledWith(ownMessage.id);
	});

	it('shows quoted message when reply_to is set', () => {
		const replyMsg = { ...baseMessage, id: 2, reply_to: 1 };
		render(<MessagesList {...defaultProps} filteredMessages={[baseMessage, replyMsg]} />);
		expect(screen.getByTestId('quote-message')).toBeInTheDocument();
	});
});
