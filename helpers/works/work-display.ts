import { getCompletionDate, getCreatedDate, getWorkDuration } from '@/lib/works/metrics';
import type { WorkWithProgress } from '@/lib/works/works';

export function workTitle(w: WorkWithProgress): string {
	return w.name?.trim() || w.address?.trim() || `Obra #${w.id}`;
}

export function workClient(w: WorkWithProgress): string {
	const name = w.client_name ?? w.clients?.name ?? '';
	const last = w.client_last_name ?? w.clients?.last_name ?? '';
	return `${name} ${last}`.replace(/\s+/g, ' ').trim();
}

export function workCreated(w: WorkWithProgress): string | null {
	return getCreatedDate(w);
}

export function workCompleted(w: WorkWithProgress): string | null {
	return getCompletionDate(w);
}

/** Days when the duration is valid, otherwise null. */
export function workDurationDays(w: WorkWithProgress): number | null {
	const d = getWorkDuration(w);
	return d.state === 'valid' ? d.days : null;
}
