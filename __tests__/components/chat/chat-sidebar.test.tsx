import { render, screen, fireEvent } from '@testing-library/react';
import { ChatSidebar } from '@/components/business/chat/chat-sidebar';
import { ChannelWithLastMessage } from '@/lib/chat/chat-types';
import { CHAT_CONSTANTS, MAX_UNREAD_DISPLAY } from '@/constants/chat/chat.constants';

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/use-mobile', () => ({
	useIsMobile: jest.fn().mockReturnValue(false),
}));

jest.mock('lucide-react', () => ({
	Plus: (props: any) => <svg data-testid="icon-plus" {...props} />,
	Trash2: (props: any) => <svg data-testid="icon-trash" {...props} />,
}));

const channels: ChannelWithLastMessage[] = [
	{ id: 1, name: 'General', description: 'Canal general', last_message_id: null, unread_count: 3 },
	{ id: 2, name: 'Ventas', description: null, last_message_id: null, unread_count: 0 },
	{ id: 3, name: '', description: 'Sin nombre channel', last_message_id: null },
];

describe('ChatSidebar', () => {
	const defaultProps = {
		channels,
		selectedChannel: null,
		loading: false,
		initialLoadDone: true,
		isAdmin: false,
		onChannelSelect: jest.fn(),
		onCreateChannel: jest.fn(),
		onDeleteChannel: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the title', () => {
		render(<ChatSidebar {...defaultProps} />);
		expect(screen.getByText(CHAT_CONSTANTS.CHANNELS.TITLE)).toBeInTheDocument();
	});

	it('renders channel names', () => {
		render(<ChatSidebar {...defaultProps} />);
		expect(screen.getByText('General')).toBeInTheDocument();
		expect(screen.getByText('Ventas')).toBeInTheDocument();
	});

	it('renders "Sin nombre" for channels without name', () => {
		render(<ChatSidebar {...defaultProps} />);
		expect(screen.getByText(CHAT_CONSTANTS.CHANNELS.NO_NAME)).toBeInTheDocument();
	});

	it('renders channel descriptions', () => {
		render(<ChatSidebar {...defaultProps} />);
		expect(screen.getByText('Canal general')).toBeInTheDocument();
	});

	it('shows loading message when loading and not initialLoadDone', () => {
		render(<ChatSidebar {...defaultProps} loading initialLoadDone={false} />);
		expect(screen.getByText(CHAT_CONSTANTS.MESSAGES.LOADING_CHANNELS)).toBeInTheDocument();
	});

	it('shows no channels message when channels array is empty', () => {
		render(<ChatSidebar {...defaultProps} channels={[]} />);
		expect(screen.getByText(CHAT_CONSTANTS.MESSAGES.NO_CHANNELS)).toBeInTheDocument();
	});

	it('does not show new channel button for non-admin', () => {
		render(<ChatSidebar {...defaultProps} isAdmin={false} />);
		expect(screen.queryByText(CHAT_CONSTANTS.CHANNELS.NEW_CHANNEL)).not.toBeInTheDocument();
	});

	it('shows new channel button for admin', () => {
		render(<ChatSidebar {...defaultProps} isAdmin />);
		expect(screen.getByText(CHAT_CONSTANTS.CHANNELS.NEW_CHANNEL)).toBeInTheDocument();
	});

	it('calls onCreateChannel when new channel button is clicked', () => {
		render(<ChatSidebar {...defaultProps} isAdmin />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.CHANNELS.NEW_CHANNEL));
		expect(defaultProps.onCreateChannel).toHaveBeenCalledTimes(1);
	});

	it('calls onChannelSelect when a channel is clicked', () => {
		render(<ChatSidebar {...defaultProps} />);
		fireEvent.click(screen.getByText('General'));
		expect(defaultProps.onChannelSelect).toHaveBeenCalledWith(channels[0]);
	});

	it('highlights the selected channel', () => {
		render(<ChatSidebar {...defaultProps} selectedChannel={channels[0]} />);
		const buttons = screen.getAllByText('General');
		const channelBtn = buttons[0].closest('button')!.parentElement!;
		expect(channelBtn.className).toContain('bg-primary');
	});

	it('shows unread count badge', () => {
		render(<ChatSidebar {...defaultProps} />);
		expect(screen.getByText('3')).toBeInTheDocument();
	});

	it('caps unread count at MAX_UNREAD_DISPLAY', () => {
		const ch = { ...channels[0], unread_count: 150 };
		render(<ChatSidebar {...defaultProps} channels={[ch]} />);
		expect(screen.getByText(`${MAX_UNREAD_DISPLAY}+`)).toBeInTheDocument();
	});

	it('does not show delete button for non-admin', () => {
		render(<ChatSidebar {...defaultProps} isAdmin={false} />);
		expect(screen.queryByTestId('icon-trash')).not.toBeInTheDocument();
	});

	it('shows delete buttons for admin', () => {
		render(<ChatSidebar {...defaultProps} isAdmin />);
		const trashIcons = screen.getAllByTestId('icon-trash');
		expect(trashIcons.length).toBe(channels.length);
	});

	it('calls onDeleteChannel when delete button is clicked', () => {
		render(<ChatSidebar {...defaultProps} isAdmin />);
		const trashButtons = screen.getAllByTestId('icon-trash');
		fireEvent.click(trashButtons[0]);
		expect(defaultProps.onDeleteChannel).toHaveBeenCalledWith(1, 'General');
	});

	it('shows push notification settings on mobile', () => {
		const { useIsMobile } = require('@/components/ui/use-mobile');
		useIsMobile.mockReturnValue(true);

		const pushSettings = <div data-testid="push-settings">Push</div>;
		render(<ChatSidebar {...defaultProps} pushNotificationSettings={pushSettings} />);
		expect(screen.getByTestId('push-settings')).toBeInTheDocument();
	});

	it('does not show push notification settings on desktop', () => {
		const { useIsMobile } = require('@/components/ui/use-mobile');
		useIsMobile.mockReturnValue(false);
		const pushSettings = <div data-testid="push-settings">Push</div>;
		render(<ChatSidebar {...defaultProps} pushNotificationSettings={pushSettings} />);
		expect(screen.queryByTestId('push-settings')).not.toBeInTheDocument();
	});
});
