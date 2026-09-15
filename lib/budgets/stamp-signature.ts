import { PDFDocument } from 'pdf-lib';
import { fitInsideBox, toPdfRect } from '@/helpers/budgets/signature-position';
import type { SignaturePlacement } from '@/helpers/budgets/signature-position';

/**
 * Draws the signature onto the document and returns the signed PDF.
 * The original file is never touched: this produces a new document.
 */
export async function stampSignature(
	pdfBytes: ArrayBuffer | Uint8Array,
	signaturePng: Uint8Array,
	placement: SignaturePlacement
): Promise<Uint8Array> {
	const pdfDocument = await PDFDocument.load(pdfBytes);
	const pages = pdfDocument.getPages();

	// The placement is 1-based; fall back to the last page if it no longer exists.
	const pageIndex = Math.min(Math.max(placement.pageNumber - 1, 0), pages.length - 1);
	const page = pages[pageIndex];

	const { width: pageWidth, height: pageHeight } = page.getSize();
	const box = toPdfRect(placement, pageWidth, pageHeight);

	const signatureImage = await pdfDocument.embedPng(signaturePng);
	const fitted = fitInsideBox(signatureImage.width, signatureImage.height, box.width, box.height);

	page.drawImage(signatureImage, {
		x: box.x + fitted.offsetX,
		y: box.y + fitted.offsetY,
		width: fitted.width,
		height: fitted.height,
	});

	return pdfDocument.save();
}

/** Turns the `data:image/png;base64,...` the canvas produces into bytes. */
export function decodeSignatureDataUrl(dataUrl: string): Uint8Array | null {
	const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());

	if (!match) return null;

	try {
		return new Uint8Array(Buffer.from(match[1], 'base64'));
	} catch {
		return null;
	}
}
