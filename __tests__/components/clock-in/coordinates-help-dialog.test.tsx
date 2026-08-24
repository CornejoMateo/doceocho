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

	it('does not render when closed', () => {
		render(<CoordinatesHelpDialog open={false} onOpenChange={mockOnOpenChange} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders when open', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
		expect(screen.getByText('Cómo obtener coordenadas de Google Maps')).toBeInTheDocument();
	});

	it('shows the steps to obtain coordinates', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		expect(screen.getByText(/Abre/)).toBeInTheDocument();
		expect(screen.getAllByText('Google Maps').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText(/Haz clic derecho/)).toBeInTheDocument();
	});

	it('has a link to Google Maps with target="_blank"', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		const link = screen.getByText('Google Maps').closest('a');
		expect(link).toHaveAttribute('href', 'https://maps.google.com');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('button "Entendido" has type="button"', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		const button = screen.getByText('Entendido');
		expect(button).toHaveAttribute('type', 'button');
	});

	it('closes the dialog when clicking "Entendido"', () => {
		render(<CoordinatesHelpDialog open={true} onOpenChange={mockOnOpenChange} />);
		fireEvent.click(screen.getByText('Entendido'));
		expect(mockOnOpenChange).toHaveBeenCalledWith(false);
	});
});
