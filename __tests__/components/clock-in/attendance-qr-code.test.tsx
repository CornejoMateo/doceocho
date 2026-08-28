import { render, screen, waitFor } from '@testing-library/react';
import AttendanceQRCode from '@/components/business/clock-in/attendance-qr-code';

jest.mock('qrcode.react', () => ({
	QRCodeSVG: ({ value, ...props }: any) => (
		<svg data-testid="qr-code" data-value={value} {...props} />
	),
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
	jest.useFakeTimers();
	mockFetch.mockReset();
});

afterEach(() => {
	jest.useRealTimers();
});

describe('AttendanceQRCode', () => {
	it('shows "Cargando QR..." while loading', () => {
		mockFetch.mockReturnValue(new Promise(() => {}));
		render(<AttendanceQRCode />);
		expect(screen.getByText('Cargando QR...')).toBeInTheDocument();
	});

	it('shows the QR when the API responds correctly', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ token: 'test-token-123' }),
		});
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByTestId('qr-code')).toBeInTheDocument();
		});
		expect(screen.getByTestId('qr-code')).toHaveAttribute('data-value', 'test-token-123');
	});

	it('shows countdown "Se renueva en Xs" after loading', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ token: 'token' }),
		});
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText(/Se renueva en/)).toBeInTheDocument();
		});
	});

	it('shows error when the API fails', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: 'fail' }),
		});
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText('No se pudo generar el QR')).toBeInTheDocument();
		});
	});

	it('shows error when fetch throws an exception', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText('No se pudo generar el QR')).toBeInTheDocument();
		});
	});

	it('shows "Reintentar" button when there is an error', async () => {
		mockFetch.mockRejectedValue(new Error('fail'));
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
	});

	it('retries when clicking "Reintentar"', async () => {
		mockFetch.mockRejectedValueOnce(new Error('fail'));
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});

		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ token: 'recovered-token' }),
		});
		screen.getByText('Reintentar').click();
		await waitFor(() => {
			expect(screen.getByTestId('qr-code')).toHaveAttribute('data-value', 'recovered-token');
		});
	});

	it('does not show error or QR while loading initially', () => {
		mockFetch.mockReturnValue(new Promise(() => {}));
		render(<AttendanceQRCode />);
		expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
		expect(screen.queryByText('No se pudo generar el QR')).not.toBeInTheDocument();
	});

	it('calls fetch on mount', () => {
		mockFetch.mockReturnValue(new Promise(() => {}));
		render(<AttendanceQRCode />);
		expect(mockFetch).toHaveBeenCalledWith('/api/attendance/qr');
	});

	it('refreshes the QR when the tab becomes visible again', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ token: 'initial' }),
		});
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByTestId('qr-code')).toHaveAttribute('data-value', 'initial');
		});

		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ token: 'refreshed' }),
		});

		Object.defineProperty(document, 'visibilityState', {
			value: 'visible',
			configurable: true,
		});
		document.dispatchEvent(new Event('visibilitychange'));

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});
});
