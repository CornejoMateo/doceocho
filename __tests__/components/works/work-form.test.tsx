import { render, screen, fireEvent } from '@testing-library/react';
import { WorkForm } from '@/components/business/works/work-form';

describe('WorkForm', () => {
	const onSubmit = jest.fn();
	const onCancel = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders form fields', () => {
		render(<WorkForm clientId={1} onSubmit={onSubmit} onCancel={onCancel} />);

		expect(screen.getByLabelText('Localidad')).toBeInTheDocument();
		expect(screen.getByLabelText('Dirección')).toBeInTheDocument();
		expect(screen.getByLabelText('Mobiliario')).toBeInTheDocument();
		expect(screen.getByLabelText('Arquitecto')).toBeInTheDocument();
		expect(screen.getByText('Estado')).toBeInTheDocument();
	});

	it('renders submit and cancel buttons', () => {
		render(<WorkForm clientId={1} onSubmit={onSubmit} onCancel={onCancel} />);

		expect(screen.getByText('Guardar Obra')).toBeInTheDocument();
		expect(screen.getByText('Cancelar')).toBeInTheDocument();
	});

	it('calls onCancel when cancel button is clicked', () => {
		render(<WorkForm clientId={1} onSubmit={onSubmit} onCancel={onCancel} />);

		fireEvent.click(screen.getByText('Cancelar'));
		expect(onCancel).toHaveBeenCalled();
	});

	it('calls onSubmit with form data', async () => {
		onSubmit.mockResolvedValue(undefined);

		render(<WorkForm clientId={1} onSubmit={onSubmit} onCancel={onCancel} />);

		fireEvent.change(screen.getByLabelText('Nombre de la obra'), {
			target: { value: 'Obra Test' },
		});
		fireEvent.change(screen.getByLabelText('Localidad'), { target: { value: 'CABA' } });
		fireEvent.change(screen.getByLabelText('Dirección'), {
			target: { value: 'Av. Siempre Viva 123' },
		});
		fireEvent.change(screen.getByLabelText('Mobiliario'), { target: { value: 'Mesa y sillas' } });
		fireEvent.change(screen.getByLabelText('Arquitecto'), { target: { value: 'Arq. Pérez' } });

		fireEvent.click(screen.getByText('Guardar Obra'));

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				locality: 'CABA',
				address: 'Av. Siempre Viva 123',
				furniture: 'Mesa y sillas',
				architect: 'Arq. Pérez',
				status: 'pending',
			})
		);
	});

	it('requires locality field', () => {
		render(<WorkForm clientId={1} onSubmit={onSubmit} onCancel={onCancel} />);

		const localityInput = screen.getByLabelText('Localidad');
		expect(localityInput).toBeRequired();
	});

	it('renders status select with default value', () => {
		render(<WorkForm clientId={1} onSubmit={onSubmit} onCancel={onCancel} />);

		expect(screen.getByText('Estado')).toBeInTheDocument();
	});
});
