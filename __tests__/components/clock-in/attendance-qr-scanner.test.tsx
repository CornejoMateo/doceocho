import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QRScanner from '@/components/business/clock-in/attendance-qr-scanner';

const mockStart = jest.fn();
const mockStop = jest.fn();
const mockDestroy = jest.fn();

jest.mock('qr-scanner', () => {
	return jest.fn().mockImplementation(() => ({
		start: mockStart,
		stop: mockStop,
		destroy: mockDestroy,
	}));
});

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

beforeEach(() => {
	mockStart.mockReset();
	mockStop.mockReset();
	mockDestroy.mockReset();
	mockStart.mockResolvedValue(undefined);
});

describe('QRScanner', () => {
	const mockOnScan = jest.fn();
	const mockOnClose = jest.fn();

	it('muestra el video del scanner', () => {
		const { container } = render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		expect(container.querySelector('video')).toBeInTheDocument();
	});

	it('muestra botón Cancelar', () => {
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		expect(screen.getByText('Cancelar')).toBeInTheDocument();
	});

	it('llama a onClose al hacer clic en Cancelar', () => {
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		screen.getByText('Cancelar').click();
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('inicia el scanner al montar', async () => {
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(mockStart).toHaveBeenCalled();
		});
	});

	it('muestra error cuando la cámara falla', async () => {
		mockStart.mockRejectedValue(new Error('NotAllowedError'));
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent(
				'No se pudo acceder a la cámara. Revisá los permisos.'
			);
		});
	});

	it('muestra botón Reintentar cuando hay error de cámara', async () => {
		mockStart.mockRejectedValue(new Error('NotAllowedError'));
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
	});

	it('no muestra Reintentar cuando no hay error', () => {
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		expect(screen.queryByText('Reintentar')).not.toBeInTheDocument();
	});

	it('reintenta al hacer clic en Reintentar', async () => {
		mockStart.mockRejectedValueOnce(new Error('fail'));
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});

		mockStart.mockResolvedValue(undefined);
		fireEvent.click(screen.getByText('Reintentar'));

		await waitFor(() => {
			expect(mockStart).toHaveBeenCalledTimes(2);
		});
	});

	it('limpia el error al reintentar', async () => {
		mockStart.mockRejectedValueOnce(new Error('fail'));
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(screen.getByRole('alert')).toBeInTheDocument();
		});

		mockStart.mockResolvedValue(undefined);
		fireEvent.click(screen.getByText('Reintentar'));

		await waitFor(() => {
			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		});
	});

	it('destruye el scanner al desmontar', async () => {
		const { unmount } = render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(mockStart).toHaveBeenCalled();
		});
		unmount();
		expect(mockStop).toHaveBeenCalled();
		expect(mockDestroy).toHaveBeenCalled();
	});
});
