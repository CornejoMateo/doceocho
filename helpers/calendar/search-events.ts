import { Event } from '@/lib/calendar/events';
import { Work } from '@/lib/works/works';

export function matchesWorkData(
	event: Event,
	search: string,
	workDataMap: Record<number, Work>
): boolean {
	if (event.work_id && workDataMap[event.work_id]) {
		const work = workDataMap[event.work_id];
		if (
			work.locality?.toLowerCase().includes(search) ||
			work.address?.toLowerCase().includes(search) ||
			work.zone?.toLowerCase().includes(search) ||
			work.hood?.toLowerCase().includes(search)
		) {
			return true;
		}
	}
	return false;
}

export function matchesSearchText(
	event: Event,
	search: string,
	workDataMap: Record<number, Work>
): boolean {
	if (search === '') return true;
	return (
		event.title?.toLowerCase().includes(search) ||
		event.client_name?.toLowerCase().includes(search) ||
		event.description?.toLowerCase().includes(search) ||
		event.type?.toLowerCase().includes(search) ||
		event.work_location?.toLowerCase().includes(search) ||
		matchesWorkData(event, search, workDataMap)
	);
}
