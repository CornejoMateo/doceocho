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
	it('muestra "Cargando QR..." mientras carga', () => {
		mockFetch.mockReturnValue(new Promise(() => {}));
		render(<AttendanceQRCode />);
		expect(screen.getByText('Cargando QR...')).toBeInTheDocument();
	});

	it('muestra el QR cuando la API responde correctamente', async () => {
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

	it('muestra countdown "Se renueva en Xs" después de cargar', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ token: 'token' }),
		});
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText(/Se renueva en/)).toBeInTheDocument();
		});
	});

	it('muestra error cuando la API falla', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({ error: 'fail' }),
		});
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText('No se pudo generar el QR')).toBeInTheDocument();
		});
	});

	it('muestra error cuando fetch lanza excepción', async () => {
		mockFetch.mockRejectedValue(new Error('Network error'));
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText('No se pudo generar el QR')).toBeInTheDocument();
		});
	});

	it('muestra botón Reintentar cuando hay error', async () => {
		mockFetch.mockRejectedValue(new Error('fail'));
		render(<AttendanceQRCode />);
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
	});

	it('reintenta al hacer clic en Reintentar', async () => {
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

	it('no muestra error ni QR mientras carga inicialmente', () => {
		mockFetch.mockReturnValue(new Promise(() => {}));
		render(<AttendanceQRCode />);
		expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
		expect(screen.queryByText('No se pudo generar el QR')).not.toBeInTheDocument();
	});

	it('llama a fetch al montar', () => {
		mockFetch.mockReturnValue(new Promise(() => {}));
		render(<AttendanceQRCode />);
		expect(mockFetch).toHaveBeenCalledWith('/api/attendance/qr');
	});

	it('refresca el QR cuando la pestaña vuelve a ser visible', async () => {
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
