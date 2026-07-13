import { render, screen } from '@testing-library/react';
import { ChatManagement } from '@/components/business/chat/chat-management';
import { CHAT_CONSTANTS } from '@/constants/chat/chat.constants';

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/components/ui/use-mobile', () => ({
	useIsMobile: jest.fn().mockReturnValue(false),
}));

jest.mock('@/hooks/chat/use-chat-management', () => ({
	useChatManagement: jest.fn(),
}));

jest.mock('@/hooks/chat/use-chat-realtime', () => ({
	useChatRealtime: jest.fn(),
}));

jest.mock('@/hooks/push/use-push-notifications', () => ({
	usePushNotifications: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, ...props }: any) => (
		<div data-testid="card" {...props}>
			{children}
		</div>
	),
}));

jest.mock('@/components/business/chat/chat-sidebar', () => ({
	ChatSidebar: (props: any) => <div data-testid="chat-sidebar" />,
}));

jest.mock('@/components/business/chat/chat-header', () => ({
	ChatHeader: (props: any) => <div data-testid="chat-header" />,
}));

jest.mock('@/components/business/chat/messages-list', () => ({
	MessagesList: (props: any) => <div data-testid="messages-list" />,
}));

jest.mock('@/components/business/chat/message-input', () => ({
	MessageInput: (props: any) => <div data-testid="message-input" />,
}));

jest.mock('@/components/business/chat/push-notification-settings', () => ({
	PushNotificationSettings: (props: any) => <div data-testid="push-notification-settings" />,
}));

jest.mock('@/components/business/chat/cleanup-messages-dialog', () => ({
	CleanupMessagesDialog: (props: any) => <div data-testid="cleanup-dialog" />,
}));

jest.mock('@/components/business/chat/create-channel-dialog', () => ({
	CreateChannelDialog: (props: any) => <div data-testid="create-dialog" />,
}));

jest.mock('@/components/business/chat/channel-members-dialog', () => ({
	ChannelMembersDialog: (props: any) => <div data-testid="members-dialog" />,
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

import { useAuth } from '@/components/provider/auth-provider';
import { useChatManagement } from '@/hooks/chat/use-chat-management';
import { useChatRealtime } from '@/hooks/chat/use-chat-realtime';
import { usePushNotifications } from '@/hooks/push/use-push-notifications';
import { fireEvent } from '@testing-library/react';

const mockUser = {
	id: 'user-1',
	username: 'admin',
	name: 'Admin',
	last_name: 'User',
	role: 'Admin',
};

const mockChatManagement = {
	channels: [],
	selectedChannel: null,
	newMessage: '',
	loading: false,
	initialLoadDone: true,
	totalUnreadCount: 0,
	showCreateDialog: false,
	showMembersDialog: false,
	members: [],
	searchTerm: '',
	showSearch: false,
	editingMessage: null,
	showSidebar: true,
	showCleanupDialog: false,
	cleanupDate: '',
	sending: false,
	scrolledToUnread: false,
	replyingTo: null,
	pendingDeleteMessage: null,
	pendingDeleteChannel: null,
	pendingCleanupMessages: false,
	optimisticMessages: [],
	isAdmin: true,
	setNewMessage: jest.fn(),
	setSearchTerm: jest.fn(),
	setShowSearch: jest.fn(),
	setEditingMessage: jest.fn(),
	setShowSidebar: jest.fn(),
	setShowCleanupDialog: jest.fn(),
	setCleanupDate: jest.fn(),
	setShowCreateDialog: jest.fn(),
	setShowMembersDialog: jest.fn(),
	setSelectedChannel: jest.fn(),
	setChannels: jest.fn(),
	loadChannels: jest.fn(),
	loadMembers: jest.fn(),
	handleSendMessage: jest.fn(),
	handleChannelSelect: jest.fn(),
	handleCreateChannel: jest.fn(),
	handleShowMembers: jest.fn(),
	handleChannelCreated: jest.fn(),
	handleDeleteMessage: jest.fn(),
	handleEditMessage: jest.fn(),
	handleDeleteChannel: jest.fn(),
	handleCleanupMessages: jest.fn(),
	handleReplyTo: jest.fn(),
	handleCancelReply: jest.fn(),
	confirmDeleteMessage: jest.fn(),
	confirmDeleteChannel: jest.fn(),
	confirmCleanupMessages: jest.fn(),
	cancelDeleteMessage: jest.fn(),
	cancelDeleteChannel: jest.fn(),
	cancelCleanupMessages: jest.fn(),
	handleScrolledToUnread: jest.fn(),
};

const mockChatRealtime = {
	messages: [],
	loading: false,
	loadingMore: false,
	hasMore: false,
	loadMore: jest.fn().mockResolvedValue(0),
};

const mockPushNotifications = {
	isSupported: true,
	permission: 'default' as NotificationPermission,
	subscription: null,
	requestPermission: jest.fn().mockResolvedValue({ success: true }),
	subscribe: jest.fn().mockResolvedValue({ success: true }),
	unsubscribe: jest.fn().mockResolvedValue({ success: true }),
};

describe('ChatManagement', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAuth as jest.Mock).mockReturnValue({ user: mockUser });
		(useChatManagement as jest.Mock).mockReturnValue(mockChatManagement);
		(useChatRealtime as jest.Mock).mockReturnValue(mockChatRealtime);
		(usePushNotifications as jest.Mock).mockReturnValue(mockPushNotifications);
	});

	it('renders loading when no user', () => {
		(useAuth as jest.Mock).mockReturnValue({ user: null });
		render(<ChatManagement />);
		expect(screen.getByText('Cargando...')).toBeInTheDocument();
	});

	it('renders sidebar and card for desktop', () => {
		render(<ChatManagement />);
		expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
		expect(screen.getByTestId('card')).toBeInTheDocument();
	});

	it('calls loadChannels on mount', () => {
		render(<ChatManagement />);
		expect(mockChatManagement.loadChannels).toHaveBeenCalled();
	});

	it('shows select channel message when no channel selected', () => {
		render(<ChatManagement />);
		expect(screen.getByText(CHAT_CONSTANTS.MESSAGES.SELECT_CHANNEL)).toBeInTheDocument();
	});

	it('shows header, messages, input when channel selected', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			selectedChannel: { id: 1, name: 'General', description: null, last_message_id: null },
		});
		render(<ChatManagement />);
		expect(screen.getByTestId('chat-header')).toBeInTheDocument();
		expect(screen.getByTestId('messages-list')).toBeInTheDocument();
		expect(screen.getByTestId('message-input')).toBeInTheDocument();
	});

	it('hides sidebar on mobile when channel selected', () => {
		const { useIsMobile } = require('@/components/ui/use-mobile');
		useIsMobile.mockReturnValue(true);
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			selectedChannel: { id: 1, name: 'General', description: null, last_message_id: null },
		});
		render(<ChatManagement />);
		expect(screen.queryByTestId('chat-sidebar')).not.toBeInTheDocument();
	});

	it('shows sidebar on mobile when no channel selected', () => {
		const { useIsMobile } = require('@/components/ui/use-mobile');
		useIsMobile.mockReturnValue(true);
		render(<ChatManagement />);
		expect(screen.getByTestId('chat-sidebar')).toBeInTheDocument();
	});

	it('renders create channel dialog when showCreateDialog is true', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			showCreateDialog: true,
		});
		render(<ChatManagement />);
		expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
	});

	it('renders members dialog when showMembersDialog is true', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			showMembersDialog: true,
		});
		render(<ChatManagement />);
		expect(screen.getByTestId('members-dialog')).toBeInTheDocument();
	});

	it('renders cleanup dialog when showCleanupDialog is true', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			showCleanupDialog: true,
		});
		render(<ChatManagement />);
		expect(screen.getByTestId('cleanup-dialog')).toBeInTheDocument();
	});

	it('shows delete message confirmation when pendingDeleteMessage is set', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			pendingDeleteMessage: 42,
		});
		render(<ChatManagement />);
		expect(screen.getByText('Eliminar mensaje')).toBeInTheDocument();
		expect(
			screen.getByText('¿Estás seguro de que quieres eliminar este mensaje?')
		).toBeInTheDocument();
	});

	it('calls confirmDeleteMessage when confirm is clicked', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			pendingDeleteMessage: 42,
		});
		render(<ChatManagement />);
		const eliminateButtons = screen.getAllByText('Eliminar');
		fireEvent.click(eliminateButtons[0]);
		expect(mockChatManagement.confirmDeleteMessage).toHaveBeenCalled();
	});

	it('shows delete channel confirmation when pendingDeleteChannel is set', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			pendingDeleteChannel: { id: 1, name: 'General' },
		});
		render(<ChatManagement />);
		expect(screen.getByText('Eliminar canal')).toBeInTheDocument();
	});

	it('calls confirmDeleteChannel when confirm is clicked', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			pendingDeleteChannel: { id: 1, name: 'General' },
		});
		render(<ChatManagement />);
		const eliminateButtons = screen.getAllByText('Eliminar');
		fireEvent.click(eliminateButtons[0]);
		expect(mockChatManagement.confirmDeleteChannel).toHaveBeenCalled();
	});

	it('shows cleanup confirmation when pendingCleanupMessages is true', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			pendingCleanupMessages: true,
		});
		render(<ChatManagement />);
		expect(screen.getByText('Limpiar mensajes')).toBeInTheDocument();
	});

	it('calls confirmCleanupMessages when confirm is clicked', () => {
		(useChatManagement as jest.Mock).mockReturnValue({
			...mockChatManagement,
			pendingCleanupMessages: true,
		});
		render(<ChatManagement />);
		const eliminateButtons = screen.getAllByText('Eliminar');
		fireEvent.click(eliminateButtons[0]);
		expect(mockChatManagement.confirmCleanupMessages).toHaveBeenCalled();
	});
});
