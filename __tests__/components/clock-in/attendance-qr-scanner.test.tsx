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

	it('shows the scanner video', () => {
		const { container } = render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		expect(container.querySelector('video')).toBeInTheDocument();
	});

	it('shows "Cancelar" button', () => {
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		expect(screen.getByText('Cancelar')).toBeInTheDocument();
	});

	it('calls onClose when clicking "Cancelar"', () => {
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		screen.getByText('Cancelar').click();
		expect(mockOnClose).toHaveBeenCalled();
	});

	it('initializes the scanner on mount', async () => {
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(mockStart).toHaveBeenCalled();
		});
	});

	it('shows error when camera fails', async () => {
		mockStart.mockRejectedValue(new Error('NotAllowedError'));
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(screen.getByRole('alert')).toHaveTextContent(
				'No se pudo acceder a la cámara. Revisá los permisos.'
			);
		});
	});

	it('shows "Reintentar" button when there is a camera error', async () => {
		mockStart.mockRejectedValue(new Error('NotAllowedError'));
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(screen.getByText('Reintentar')).toBeInTheDocument();
		});
	});

	it('does not show "Reintentar" button when there is no error', () => {
		render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		expect(screen.queryByText('Reintentar')).not.toBeInTheDocument();
	});

	it('retries when clicking "Reintentar"', async () => {
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

	it('clears the error when retrying', async () => {
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

	it('destroys the scanner on unmount', async () => {
		const { unmount } = render(<QRScanner onScan={mockOnScan} onClose={mockOnClose} />);
		await waitFor(() => {
			expect(mockStart).toHaveBeenCalled();
		});
		unmount();
		expect(mockStop).toHaveBeenCalled();
		expect(mockDestroy).toHaveBeenCalled();
	});
});
