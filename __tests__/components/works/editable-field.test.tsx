import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditableField } from '@/components/business/works/editable-field';

const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
	toast: (...args: any[]) => mockToast(...args),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

describe('EditableField', () => {
	const onSave = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders display mode with value', () => {
		render(<EditableField value="Calle 123" onSave={onSave} />);

		expect(screen.getByText('Calle 123')).toBeInTheDocument();
	});

	it('renders "Sin especificar" when value is empty', () => {
		render(<EditableField value="" onSave={onSave} />);

		expect(screen.getByText('Sin especificar')).toBeInTheDocument();
	});

	it('renders label when provided', () => {
		render(<EditableField value="Calle 123" onSave={onSave} label="Dirección" />);

		expect(screen.getByText('Dirección:')).toBeInTheDocument();
	});

	it('applies formatDisplay function', () => {
		render(
			<EditableField value="calle 123" onSave={onSave} formatDisplay={(v) => v.toUpperCase()} />
		);

		expect(screen.getByText('CALLE 123')).toBeInTheDocument();
	});

	it('enters edit mode when pencil button is clicked', () => {
		render(<EditableField value="Calle 123" onSave={onSave} />);

		const pencil = screen.getByRole('button');
		fireEvent.click(pencil);

		expect(screen.getByRole('textbox')).toBeInTheDocument();
		expect(screen.getByRole('textbox')).toHaveValue('Calle 123');
	});

	it('shows save and cancel buttons in edit mode', () => {
		render(<EditableField value="Test" onSave={onSave} />);

		fireEvent.click(screen.getByRole('button'));

		const checkButtons = screen.getAllByRole('button');
		expect(checkButtons).toHaveLength(2);
	});

	it('calls onSave when save button is clicked', async () => {
		onSave.mockResolvedValue(undefined);

		render(<EditableField value="Old" onSave={onSave} />);

		fireEvent.click(screen.getByRole('button'));

		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'New' } });

		fireEvent.click(screen.getAllByRole('button')[0]);

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith('New');
		});
	});

	it('does not call onSave if value is unchanged', async () => {
		render(<EditableField value="Same" onSave={onSave} />);

		fireEvent.click(screen.getByRole('button'));
		fireEvent.click(screen.getAllByRole('button')[0]);

		expect(onSave).not.toHaveBeenCalled();
	});

	it('cancels edit mode without saving', () => {
		render(<EditableField value="Original" onSave={onSave} />);

		fireEvent.click(screen.getByRole('button'));

		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'Changed' } });

		const cancelButton = screen.getAllByRole('button')[1];
		fireEvent.click(cancelButton);

		expect(screen.getByText('Original')).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	it('pencil button is visible on mobile (opacity-100 by default)', () => {
		render(<EditableField value="Test" onSave={onSave} />);

		const pencil = screen.getByRole('button');
		expect(pencil.className).toContain('opacity-100');
		expect(pencil.className).toContain('sm:opacity-0');
	});

	it('pencil button has shrink-0 to prevent being compressed', () => {
		render(<EditableField value="Test" onSave={onSave} />);

		const pencil = screen.getByRole('button');
		expect(pencil.className).toContain('shrink-0');
	});

	it('shows error toast when save fails', async () => {
		onSave.mockRejectedValue(new Error('Network error'));

		render(<EditableField value="Test" onSave={onSave} />);

		fireEvent.click(screen.getByRole('button'));

		const input = screen.getByRole('textbox');
		fireEvent.change(input, { target: { value: 'New' } });

		fireEvent.click(screen.getAllByRole('button')[0]);

		await waitFor(() => {
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({ variant: 'destructive', title: 'Error al guardar' })
			);
		});
	});
});
