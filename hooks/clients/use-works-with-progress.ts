import { useEffect, useState } from 'react';
import { getChecklistsByWorkIds, getItemsByChecklistIds } from '@/lib/checklists/checklists';
import { getFolderBudgetWorkIds } from '@/lib/budgets/folder_budgets';
import { listWorks } from '@/lib/works/works';
import { WorkWithProgress } from '@/lib/works/works';
import { updateWork } from '@/lib/works/works';

export function useWorksWithProgress() {
	const [works, setWorks] = useState<WorkWithProgress[]>([]);
	const [loading, setLoading] = useState(true);

	const load = async () => {
		try {
			setLoading(true);

			const { data: worksData, error } = await listWorks();
			if (error) throw error;

			if (!worksData?.length) {
				setWorks([]);
				return;
			}

			const workIds = worksData.map((w) => w.id);
			const { data: allChecklists } = await getChecklistsByWorkIds(workIds);

			const { data: folderBudgetWorkIds, error: folderBudgetError } =
				await getFolderBudgetWorkIds();
			if (folderBudgetError) {
				throw folderBudgetError;
			}
			const workIdsWithBudget = new Set<number>(folderBudgetWorkIds ?? []);

			const checklistIds = (allChecklists ?? []).map((c) => c.id);
			const { data: allItems, error: itemsError } = await getItemsByChecklistIds(checklistIds);
			if (itemsError) throw itemsError;
			const itemsByChecklist = new Map<number, any[]>();
			if (allItems) {
				for (const item of allItems) {
					const existing = itemsByChecklist.get(item.checklist_id) || [];
					existing.push(item);
					itemsByChecklist.set(item.checklist_id, existing);
				}
			}

			const hasNotesByWork = new Map<number, boolean>();

			for (const cl of allChecklists ?? []) {
				const wid = cl.work_id;
				if (!wid) continue;

				if (!hasNotesByWork.get(wid)) {
					hasNotesByWork.set(wid, !!cl.notes?.trim());
				}
			}

			const enriched = worksData.map((work) => {
				const workChecklists = (allChecklists ?? []).filter((c) => c.work_id === work.id);

				let total = 0;
				let done = 0;
				const tasks: any[] = [];
				for (const cl of workChecklists) {
					const clItems = itemsByChecklist.get(cl.id) || [];
					total += clItems.length;
					done += clItems.filter((t: any) => t.done).length;
					tasks.push(...clItems);
				}
				const progress = total ? Math.round((done / total) * 100) : 100;
				const hasGeneralNotes = !!work.general_note?.trim();

				const hasNotes = hasNotesByWork.get(work.id) ?? false;

				let newStatus = work.status;
				if (total > 0) {
					if (progress === 100 && work.status !== 'completed' && !hasNotes && !hasGeneralNotes) {
						newStatus = 'completed';
					} else if (progress > 0 && progress < 100 && work.status !== 'in_progress') {
						newStatus = 'in_progress';
					} else if (work.status === 'completed' && (hasNotes || hasGeneralNotes)) {
						newStatus = 'in_progress';
					}
				}

				return {
					...work,
					status: newStatus,
					tasks,
					hasNotes: hasNotes,
					hasBudget: workIdsWithBudget.has(work.id),
					progress,
				};
			});

			const updatePromises = enriched
				.filter((work) => work.status !== worksData.find((w) => w.id === work.id)?.status)
				.map((work) => updateWork(work.id, { status: work.status }));

			await Promise.all(updatePromises);

			setWorks(enriched);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	return { works, loading, reload: load };
}
