import { render, screen, fireEvent } from '@testing-library/react';
import { EntityAttachmentsDialog } from '@/components/business/shared/attachments/entity-attachments-dialog';

const mockGallery = jest.fn((_props: any) => <div data-testid="gallery" />);

jest.mock('@/components/business/shared/attachments/attachments-gallery', () => ({
	AttachmentsGallery: (props: any) => mockGallery(props),
}));

const noop = () => {};

describe('EntityAttachmentsDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the title and the summary rows', () => {
		render(
			<EntityAttachmentsDialog
				open
				onOpenChange={noop}
				kind="expense"
				entityId={11}
				title="Detalle del gasto"
				summary={[
					{ label: 'Fecha', value: '10/01/2026' },
					{ label: 'Proveedor', value: 'Acme SRL' },
				]}
			/>
		);

		expect(screen.getByText('Detalle del gasto')).toBeInTheDocument();
		expect(screen.getByText('Fecha')).toBeInTheDocument();
		expect(screen.getByText('10/01/2026')).toBeInTheDocument();
		expect(screen.getByText('Proveedor')).toBeInTheDocument();
		expect(screen.getByText('Acme SRL')).toBeInTheDocument();
	});

	it('has a visible close button with accessible name "Cerrar" that calls onOpenChange(false)', () => {
		const onOpenChange = jest.fn();
		render(
			<EntityAttachmentsDialog
				open
				onOpenChange={onOpenChange}
				kind="expense"
				entityId={11}
				title="Detalle del gasto"
				summary={[]}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('mounts the gallery with the given kind, entityId and readOnly when open', () => {
		render(
			<EntityAttachmentsDialog
				open
				onOpenChange={noop}
				kind="payment"
				entityId={22}
				title="Detalle del pago"
				summary={[]}
			/>
		);

		expect(screen.getByTestId('gallery')).toBeInTheDocument();
		expect(mockGallery).toHaveBeenCalledWith(
			expect.objectContaining({ kind: 'payment', entityId: 22, readOnly: true })
		);
	});

	it('does not mount the gallery when closed', () => {
		render(
			<EntityAttachmentsDialog
				open={false}
				onOpenChange={noop}
				kind="expense"
				entityId={11}
				title="Detalle del gasto"
				summary={[]}
			/>
		);

		expect(screen.queryByTestId('gallery')).not.toBeInTheDocument();
		expect(mockGallery).not.toHaveBeenCalled();
	});

	it('does not mount the gallery when entityId is null, even if open', () => {
		render(
			<EntityAttachmentsDialog
				open
				onOpenChange={noop}
				kind="expense"
				entityId={null}
				title="Detalle del gasto"
				summary={[]}
			/>
		);

		expect(screen.queryByTestId('gallery')).not.toBeInTheDocument();
	});

	it('remounts the gallery (fresh fetch) each time the dialog re-opens', () => {
		const { rerender } = render(
			<EntityAttachmentsDialog
				open
				onOpenChange={noop}
				kind="expense"
				entityId={11}
				title="Detalle del gasto"
				summary={[]}
			/>
		);
		expect(mockGallery).toHaveBeenCalledTimes(1);

		rerender(
			<EntityAttachmentsDialog
				open={false}
				onOpenChange={noop}
				kind="expense"
				entityId={11}
				title="Detalle del gasto"
				summary={[]}
			/>
		);
		expect(screen.queryByTestId('gallery')).not.toBeInTheDocument();

		rerender(
			<EntityAttachmentsDialog
				open
				onOpenChange={noop}
				kind="expense"
				entityId={11}
				title="Detalle del gasto"
				summary={[]}
			/>
		);
		expect(mockGallery).toHaveBeenCalledTimes(2);
	});
});
