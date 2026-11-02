import { fireEvent, render, screen } from '@testing-library/react';
import { EntityAttachmentsDialog } from '@/components/business/shared/attachments/entity-attachments-dialog';
import { listFilesWithUrlsByExpenseId } from '@/lib/expenses/files-expenses';

// Real EntityAttachmentsDialog + real AttachmentsGallery + real FileViewerModal. Only the data
// layer (file listing) is mocked, no network. Verifies the dialog-nesting-convention: closing the
// nested FileViewerModal (a Dialog itself) must never close the outer detail Dialog.
jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/lib/expenses/files-expenses', () => ({
	listFilesWithUrlsByExpenseId: jest.fn(),
	signUrlsForExpenseFiles: jest.fn(),
	deleteFileExpense: jest.fn(),
}));

jest.mock('@/lib/payments/files-payments', () => ({
	listFilesWithUrlsByPaymentId: jest.fn(),
	signUrlsForPaymentFiles: jest.fn(),
	deleteFilePayment: jest.fn(),
}));

const imageFile = {
	id: 1,
	url: 'https://signed/factura.jpg',
	name: 'factura.jpg',
	displayName: 'factura.jpg',
	description: null,
	mimetype: null,
	size: 2048,
	uploadedAt: '2026-08-28T12:00:00.000Z',
};

function dialogContents() {
	return document.querySelectorAll('[data-slot="dialog-content"]');
}

describe('EntityAttachmentsDialog + AttachmentsGallery + FileViewerModal (real nesting)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(listFilesWithUrlsByExpenseId as jest.Mock).mockResolvedValue({
			data: [imageFile],
			error: null,
		});
	});

	it('keeps the outer detail dialog open after closing the nested viewer with its close button', async () => {
		render(
			<EntityAttachmentsDialog
				open
				onOpenChange={jest.fn()}
				kind="expense"
				entityId={11}
				title="Detalle del gasto"
				summary={[]}
			/>
		);

		const chip = await screen.findByAltText('factura.jpg');
		fireEvent.click(chip.closest('button')!);

		expect(dialogContents()).toHaveLength(2);

		// Single file: the viewer's only button (besides the img itself) is its close (X) control.
		const viewerContent = dialogContents()[1];
		const closeButton = viewerContent.querySelector('button')!;
		fireEvent.click(closeButton);

		expect(dialogContents()).toHaveLength(1);
		expect(screen.getByText('Detalle del gasto')).toBeInTheDocument();
	});

	it('keeps the outer detail dialog open after dismissing the nested viewer with Escape', async () => {
		render(
			<EntityAttachmentsDialog
				open
				onOpenChange={jest.fn()}
				kind="expense"
				entityId={11}
				title="Detalle del gasto"
				summary={[]}
			/>
		);

		const chip = await screen.findByAltText('factura.jpg');
		fireEvent.click(chip.closest('button')!);

		expect(dialogContents()).toHaveLength(2);

		fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

		expect(dialogContents()).toHaveLength(1);
		expect(screen.getByText('Detalle del gasto')).toBeInTheDocument();
	});

	// A third case simulating a pointer-based outside dismissal (fireEvent.pointerDown/mouseDown/
	// click on the overlay or document.body) was attempted and dropped: Radix's dismissable-layer
	// outside-click detection never fires under jsdom's synthetic pointer events here (the viewer
	// dialog never closes), so the assertion can't exercise the real code path — it would just
	// test jsdom's event dispatch, not the app. Click-based (above) and Escape-based (below)
	// dismissal cover the convention; see .kb/bugs/radix-dismissable-layer-nested-dialog-touch.md.
});
