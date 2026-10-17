import { format, toZonedTime } from 'date-fns-tz';

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

// Exports a filename with the given base name, extension, and optional date.
// The filename is sanitized to remove any invalid characters and formatted with a timestamp.
export function exportFilename(base: string, ext: string, date: Date = new Date()): string {
	const safe = base.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '') || 'export';
	const stamp = format(toZonedTime(date, ARGENTINA_TIME_ZONE), 'dd-MM-yyyy_HHmm');
	return `${safe}_${stamp}.${ext.replace(/^\./, '')}`;
}
