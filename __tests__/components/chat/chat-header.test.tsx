import { render, screen, fireEvent } from '@testing-library/react';
import { ChatHeader } from '@/components/business/chat/chat-header';
import { ChannelWithLastMessage } from '@/lib/chat/chat-types';
import { CHAT_CONSTANTS } from '@/constants/chat/chat.constants';

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, variant, size, ...props }: any) => (
		<button onClick={onClick} data-variant={variant} data-size={size} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: ({ value, onChange, placeholder, autoFocus, ...props }: any) => (
		<input
			value={value}
			onChange={onChange}
			placeholder={placeholder}
			autoFocus={autoFocus}
			{...props}
		/>
	),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
	DropdownMenuTrigger: ({ children, asChild }: any) => <div>{children}</div>,
	DropdownMenuContent: ({ children, align }: any) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuItem: ({ children, onClick }: any) => (
		<div onClick={onClick} role="menuitem">
			{children}
		</div>
	),
}));

const channel: ChannelWithLastMessage = {
	id: 1,
	name: 'General',
	description: 'Canal general',
	last_message_id: null,
	last_message: 'Hello',
};

describe('ChatHeader', () => {
	const defaultProps = {
		channel,
		showSearch: false,
		searchTerm: '',
		showDateSearch: false,
		dateRange: { from: '', to: '' },
		isAdmin: false,
		isMobile: false,
		onSearchToggle: jest.fn(),
		onSearchChange: jest.fn(),
		onDateSearchToggle: jest.fn(),
		onDateRangeChange: jest.fn(),
		onShowMembers: jest.fn(),
		onCleanupMessages: jest.fn(),
		onSearchByDate: jest.fn(),
		onBack: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders channel name', () => {
		render(<ChatHeader {...defaultProps} />);
		expect(screen.getByText('General')).toBeInTheDocument();
	});

	it('renders channel description on desktop', () => {
		render(<ChatHeader {...defaultProps} />);
		expect(screen.getByText('Canal general')).toBeInTheDocument();
	});

	it('hides channel description on mobile', () => {
		render(<ChatHeader {...defaultProps} isMobile />);
		expect(screen.queryByText('Canal general')).not.toBeInTheDocument();
	});

	it('renders "Sin nombre" when channel has no name', () => {
		render(<ChatHeader {...defaultProps} channel={{ ...channel, name: null }} />);
		expect(screen.getByText(CHAT_CONSTANTS.CHANNELS.NO_NAME)).toBeInTheDocument();
	});

	it('shows back button on mobile', () => {
		render(<ChatHeader {...defaultProps} isMobile />);
		const buttons = screen.getAllByRole('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('calls onBack when back button is clicked', () => {
		render(<ChatHeader {...defaultProps} isMobile />);
		const buttons = screen.getAllByRole('button');
		fireEvent.click(buttons[0]);
		expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
	});

	it('shows search, clean, members buttons on desktop for admin', () => {
		render(<ChatHeader {...defaultProps} isAdmin />);
		expect(screen.getByText(CHAT_CONSTANTS.BUTTONS.CLEAN)).toBeInTheDocument();
		expect(screen.getByText(CHAT_CONSTANTS.BUTTONS.MEMBERS)).toBeInTheDocument();
	});

	it('hides clean button on desktop for non-admin', () => {
		render(<ChatHeader {...defaultProps} isAdmin={false} />);
		expect(screen.queryByText(CHAT_CONSTANTS.BUTTONS.CLEAN)).not.toBeInTheDocument();
		expect(screen.getByText(CHAT_CONSTANTS.BUTTONS.MEMBERS)).toBeInTheDocument();
	});

	it('calls onSearchToggle when search button is clicked', () => {
		render(<ChatHeader {...defaultProps} />);
		const buttons = screen.getAllByRole('button');
		fireEvent.click(buttons[0]);
		expect(defaultProps.onSearchToggle).toHaveBeenCalled();
	});

	it('calls onShowMembers when members button is clicked', () => {
		render(<ChatHeader {...defaultProps} />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.BUTTONS.MEMBERS));
		expect(defaultProps.onShowMembers).toHaveBeenCalled();
	});

	it('calls onCleanupMessages when clean button is clicked', () => {
		render(<ChatHeader {...defaultProps} isAdmin />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.BUTTONS.CLEAN));
		expect(defaultProps.onCleanupMessages).toHaveBeenCalled();
	});

	it('shows search input when showSearch is true', () => {
		render(<ChatHeader {...defaultProps} showSearch />);
		expect(
			screen.getByPlaceholderText(CHAT_CONSTANTS.MESSAGES.SEARCH_PLACEHOLDER)
		).toBeInTheDocument();
	});

	it('calls onSearchChange when search input changes', () => {
		render(<ChatHeader {...defaultProps} showSearch />);
		fireEvent.change(screen.getByPlaceholderText(CHAT_CONSTANTS.MESSAGES.SEARCH_PLACEHOLDER), {
			target: { value: 'test' },
		});
		expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test');
	});

	it('calls onSearchToggle when X button is clicked in search mode', () => {
		render(<ChatHeader {...defaultProps} showSearch />);
		const buttons = screen.getAllByRole('button');
		fireEvent.click(buttons[0]);
		expect(defaultProps.onSearchToggle).toHaveBeenCalled();
	});

	it('shows dropdown menu on mobile', () => {
		render(<ChatHeader {...defaultProps} isMobile />);
		expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
	});

	it('does not show dropdown menu on desktop', () => {
		render(<ChatHeader {...defaultProps} isMobile={false} />);
		expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
	});

	it('calls onSearchByDate when search by day is clicked in mobile dropdown', () => {
		render(<ChatHeader {...defaultProps} isMobile />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.MENU.SEARCH_BY_DATE));
		expect(defaultProps.onSearchByDate).toHaveBeenCalled();
	});

	it('calls onShowMembers when manage members is clicked in mobile dropdown', () => {
		render(<ChatHeader {...defaultProps} isMobile />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.MENU.MANAGE_MEMBERS));
		expect(defaultProps.onShowMembers).toHaveBeenCalled();
	});

	it('shows clean messages option in mobile dropdown for admin', () => {
		render(<ChatHeader {...defaultProps} isMobile isAdmin />);
		expect(screen.getByText(CHAT_CONSTANTS.MENU.CLEAN_MESSAGES)).toBeInTheDocument();
	});

	it('hides clean messages option in mobile dropdown for non-admin', () => {
		render(<ChatHeader {...defaultProps} isMobile isAdmin={false} />);
		expect(screen.queryByText(CHAT_CONSTANTS.MENU.CLEAN_MESSAGES)).not.toBeInTheDocument();
	});

	it('calls onCleanupMessages when clean messages is clicked in mobile dropdown', () => {
		render(<ChatHeader {...defaultProps} isMobile isAdmin />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.MENU.CLEAN_MESSAGES));
		expect(defaultProps.onCleanupMessages).toHaveBeenCalled();
	});
});
