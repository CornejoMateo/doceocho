import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PushNotificationSettings } from '@/components/business/chat/push-notification-settings';
import { CHAT_CONSTANTS } from '@/constants/chat/chat.constants';

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

describe('PushNotificationSettings', () => {
	const defaultProps = {
		isSupported: true,
		permission: 'default' as NotificationPermission,
		subscription: null,
		onRequestPermission: jest.fn().mockResolvedValue({ success: true }),
		onSubscribe: jest.fn().mockResolvedValue({ success: true }),
		onUnsubscribe: jest.fn().mockResolvedValue({ success: true }),
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns null when not supported', () => {
		const { container } = render(
			<PushNotificationSettings {...defaultProps} isSupported={false} />
		);
		expect(container.innerHTML).toBe('');
	});

	it('shows enable button when permission is default', () => {
		render(<PushNotificationSettings {...defaultProps} />);
		expect(screen.getByText(CHAT_CONSTANTS.PUSH_NOTIFICATIONS.ENABLE)).toBeInTheDocument();
	});

	it('calls onRequestPermission then onSubscribe when enable is clicked', async () => {
		render(<PushNotificationSettings {...defaultProps} />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.PUSH_NOTIFICATIONS.ENABLE));
		await waitFor(() => {
			expect(defaultProps.onRequestPermission).toHaveBeenCalled();
			expect(defaultProps.onSubscribe).toHaveBeenCalled();
		});
	});

	it('shows subscribe text when permission granted and no subscription', () => {
		render(<PushNotificationSettings {...defaultProps} permission="granted" />);
		const elements = screen.getAllByText(CHAT_CONSTANTS.PUSH_NOTIFICATIONS.SUBSCRIBE);
		expect(elements.length).toBeGreaterThan(0);
	});

	it('shows enabled text when permission granted and has subscription', () => {
		render(<PushNotificationSettings {...defaultProps} permission="granted" subscription={{}} />);
		expect(screen.getByText(CHAT_CONSTANTS.PUSH_NOTIFICATIONS.ENABLED)).toBeInTheDocument();
	});

	it('shows unsubscribe button when subscribed', () => {
		render(<PushNotificationSettings {...defaultProps} permission="granted" subscription={{}} />);
		expect(screen.getByText(CHAT_CONSTANTS.PUSH_NOTIFICATIONS.UNSUBSCRIBE)).toBeInTheDocument();
	});

	it('calls onUnsubscribe when unsubscribe button is clicked', async () => {
		render(<PushNotificationSettings {...defaultProps} permission="granted" subscription={{}} />);
		fireEvent.click(screen.getByText(CHAT_CONSTANTS.PUSH_NOTIFICATIONS.UNSUBSCRIBE));
		await waitFor(() => {
			expect(defaultProps.onUnsubscribe).toHaveBeenCalled();
		});
	});

	it('shows blocked text when permission is denied', () => {
		render(<PushNotificationSettings {...defaultProps} permission="denied" />);
		expect(screen.getByText(CHAT_CONSTANTS.PUSH_NOTIFICATIONS.BLOCKED)).toBeInTheDocument();
	});

	it('shows error message when subscribe fails', async () => {
		const onSubscribe = jest.fn().mockResolvedValue({ success: false, error: 'Error de red' });
		render(
			<PushNotificationSettings {...defaultProps} permission="granted" onSubscribe={onSubscribe} />
		);
		const subscribeButtons = screen.getAllByText(CHAT_CONSTANTS.PUSH_NOTIFICATIONS.SUBSCRIBE);
		fireEvent.click(subscribeButtons[subscribeButtons.length - 1]);
		await waitFor(() => {
			expect(screen.getByText('Error de red')).toBeInTheDocument();
		});
	});
});
