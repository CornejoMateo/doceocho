// Extracts the embedded raster thumbnail from a SketchUp (.skp) file.
// SketchUp stores this thumbnail (PNG or JPEG, depending on version) without further
// compression, so a raw byte scan for the image signature + terminator finds it reliably
// in both the legacy binary format and the newer zip-container format.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_IEND = [0x49, 0x45, 0x4e, 0x44]; // 'IEND'
const JPEG_SOI = [0xff, 0xd8, 0xff];
const JPEG_EOI = [0xff, 0xd9];

// Guardrails against pathological files
const MAX_SCAN_BYTES = 100 * 1024 * 1024; // don't scan files bigger than this
const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024; // a real embedded thumbnail is always small

function indexOfSequence(bytes: Uint8Array, sequence: number[], fromIndex: number): number {
	const limit = bytes.length - sequence.length;
	outer: for (let i = Math.max(fromIndex, 0); i <= limit; i++) {
		for (let j = 0; j < sequence.length; j++) {
			if (bytes[i + j] !== sequence[j]) continue outer;
		}
		return i;
	}
	return -1;
}

function yieldToMainThread(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

// Note: scanning for the terminator sequence can truncate the thumbnail if the image's own
// pixel/compressed data happens to contain those bytes before the real end marker.
function extractPng(bytes: Uint8Array): Blob | null {
	const start = indexOfSequence(bytes, PNG_SIGNATURE, 0);
	if (start === -1) return null;

	const iendTypeIndex = indexOfSequence(bytes, PNG_IEND, start + PNG_SIGNATURE.length);
	if (iendTypeIndex === -1) return null;

	const end = iendTypeIndex + PNG_IEND.length + 4; // chunk type + 4-byte CRC
	if (end <= start || end > bytes.length || end - start > MAX_THUMBNAIL_BYTES) return null;

	return new Blob([bytes.slice(start, end)], { type: 'image/png' });
}

function extractJpeg(bytes: Uint8Array): Blob | null {
	const start = indexOfSequence(bytes, JPEG_SOI, 0);
	if (start === -1) return null;

	const eoiIndex = indexOfSequence(bytes, JPEG_EOI, start + JPEG_SOI.length);
	if (eoiIndex === -1) return null;

	const end = eoiIndex + JPEG_EOI.length;
	if (end <= start || end > bytes.length || end - start > MAX_THUMBNAIL_BYTES) return null;

	return new Blob([bytes.slice(start, end)], { type: 'image/jpeg' });
}

/**
 * Scans a .skp file's raw bytes for an embedded PNG or JPEG thumbnail.
 * Returns null when no valid thumbnail is found (e.g. unsupported .skp version/export).
 */
export async function extractSkpThumbnail(data: ArrayBuffer | Blob): Promise<Blob | null> {
	try {
		const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
		if (buffer.byteLength === 0 || buffer.byteLength > MAX_SCAN_BYTES) return null;

		const bytes = new Uint8Array(buffer);
		const png = extractPng(bytes);
		if (png) return png;

		await yieldToMainThread(); // avoid a long unbroken scan on the main thread
		return extractJpeg(bytes);
	} catch {
		return null;
	}
}

/** Detects a SketchUp file by extension, not MIME (browsers report it unreliably). */
export function isSkpFileName(name: string | null | undefined): boolean {
	return !!name && name.toLowerCase().endsWith('.skp');
}
