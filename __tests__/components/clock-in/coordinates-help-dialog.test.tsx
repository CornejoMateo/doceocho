import { render, screen, fireEvent } from '@testing-library/react';
import { CoordinatesHelpDialog } from '@/components/business/clock-in/coordinates-help-dialog';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, className }: any) => (
		<div data-testid="dialog-content" className={className}>
			{children}
		</div>
	),
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

describe('CoordinatesHelpDialog', () => {
	const mockOnOpenChange = jest.fn();

	beforeEach(() => {
		mockOnOpenChange.mockClear();
	});

	it('no renderiza cuando está cerrado', () => {
		render(<CoordinatesHelpDialog open={false} onOpenChange={mockOnOpenChange} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renderiza cuando está abierto', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
		expect(screen.getByText('Cómo obtener coordenadas de Google Maps')).toBeInTheDocument();
	});

	it('muestra los pasos para obtener coordenadas', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByText(/Abre/)).toBeInTheDocument();
		expect(screen.getAllByText('Google Maps').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText(/Haz clic derecho/)).toBeInTheDocument();
	});

	it('tiene link a Google Maps con target _blank', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		const link = screen.getByText('Google Maps').closest('a');
		expect(link).toHaveAttribute('href', 'https://maps.google.com');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('botón Entendido tiene type="button"', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		const button = screen.getByText('Entendido');
		expect(button).toHaveAttribute('type', 'button');
	});

	it('cierra el dialog al hacer clic en Entendido', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		fireEvent.click(screen.getByText('Entendido'));
		expect(mockOnOpenChange).toHaveBeenCalledWith(false);
	});
});
