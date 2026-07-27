import { render, screen, fireEvent } from '@testing-library/react';
import { CleanupMessagesDialog } from '@/components/business/chat/cleanup-messages-dialog';
import { CHAT_CONSTANTS } from '@/constants/chat/chat.constants';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
	DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: ({ value, onChange, type, ...props }: any) => (
		<input value={value} onChange={onChange} type={type} {...props} />
	),
}));

describe('CleanupMessagesDialog', () => {
	const defaultProps = {
		open: true,
		onOpenChange: jest.fn(),
		cleanupDate: '',
		onCleanupDateChange: jest.fn(),
		onCleanup: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders when open', () => {
		render(<CleanupMessagesDialog {...defaultProps} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
	});

	it('does not render when closed', () => {
		render(<CleanupMessagesDialog {...defaultProps} open={false} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders the title', () => {
		render(<CleanupMessagesDialog {...defaultProps} />);
		expect(screen.getByText(CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.TITLE)).toBeInTheDocument();
	});

	it('renders the description', () => {
		render(<CleanupMessagesDialog {...defaultProps} />);
		expect(
			screen.getByText(CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.DESCRIPTION)
		).toBeInTheDocument();
	});

	it('renders a date input', () => {
		render(<CleanupMessagesDialog {...defaultProps} />);
		expect(screen.getByDisplayValue('')).toBeInTheDocument();
	});

	it('calls onCleanupDateChange when date input changes', () => {
		render(<CleanupMessagesDialog {...defaultProps} />);
		fireEvent.change(screen.getByDisplayValue(''), { target: { value: '2024-01-15' } });
		expect(defaultProps.onCleanupDateChange).toHaveBeenCalledWith('2024-01-15');
	});

	it('disables confirm button when no date selected', () => {
		render(<CleanupMessagesDialog {...defaultProps} />);
		expect(screen.getByText(CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.CONFIRM)).toBeDisabled();
	});

	it('enables confirm button when date is selected', () => {
		render(<CleanupMessagesDialog {...defaultProps} cleanupDate="2024-01-15" />);
		expect(screen.getByText(CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.CONFIRM)).not.toBeDisabled();
	});

	it('calls onCleanup when confirm is clicked', () => {
		render(<CleanupMessagesDialog {...defaultProps} cleanupDate="2024-01-15" />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.CONFIRM));
		expect(defaultProps.onCleanup).toHaveBeenCalledTimes(1);
	});

	it('calls onOpenChange(false) when cancel is clicked', () => {
		render(<CleanupMessagesDialog {...defaultProps} />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.DIALOGS.CLEANUP_MESSAGES.CANCEL));
		expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
	});
});
