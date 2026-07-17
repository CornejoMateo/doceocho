import { useState } from 'react';
import { Work } from '@/lib/works/works';
import { Checklist, ChecklistItem } from '@/lib/checklists/checklists';

export type ChecklistItemState = {
	id?: number;
	description: string;
	done?: boolean;
	sort_order?: number | null;
};

export type ChecklistState = {
	name: string | null;
	description: string | null;
	items: ChecklistItemState[];
	width: number | null;
	height: number | null;
	depth: number | null;
	type_furniture: string | null;
};

export function useChecklistModal() {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedWork, setSelectedWork] = useState<Work | null>(null);

	const openChecklist = (work: Work) => {
		setSelectedWork(work);
		setIsOpen(true);
	};

	const closeChecklist = () => {
		setIsOpen(false);
		setSelectedWork(null);
	};

	const [checklist, setChecklist] = useState<ChecklistState>({
		name: null,
		description: null,
		items: [],
		width: null,
		height: null,
		depth: null,
		type_furniture: null,
	});

	const initializeChecklist = (checklistToEdit: Checklist, existingItems?: ChecklistItem[]) => {
		setChecklist({
			name: checklistToEdit.name || null,
			description: checklistToEdit.description || null,
			items: (existingItems || []).map((item) => ({
				id: item.id,
				description: item.description,
				done: item.done,
				sort_order: item.sort_order,
			})),
			width: checklistToEdit.width ?? null,
			height: checklistToEdit.height ?? null,
			depth: checklistToEdit.depth ?? null,
			type_furniture: checklistToEdit.type_furniture ?? null,
		});
	};

	const resetForm = () => {
		setChecklist({
			name: null,
			description: null,
			items: [],
			width: null,
			height: null,
			depth: null,
			type_furniture: null,
		});
	};

	const updateField = (field: string, value: any) => {
		setChecklist((prev) => ({
			...prev,
			[field]: value === '' ? null : value,
		}));
	};

	const addItem = (description: string) => {
		if (!description.trim()) return;

		setChecklist((prev) => ({
			...prev,
			items: [...prev.items, { description: description.trim() }],
		}));
	};

	const removeItem = (index: number) => {
		setChecklist((prev) => ({
			...prev,
			items: prev.items.filter((_, i) => i !== index),
		}));
	};

	const updateItem = (index: number, description: string) => {
		setChecklist((prev) => ({
			...prev,
			items: prev.items.map((item, i) => (i === index ? { ...item, description } : item)),
		}));
	};

	const setItems = (items: ChecklistItemState[]) => {
		setChecklist((prev) => ({
			...prev,
			items,
		}));
	};

	return {
		isOpen,
		selectedWork,
		openChecklist,
		closeChecklist,
		checklist,
		updateField,
		addItem,
		removeItem,
		updateItem,
		setItems,
		resetForm,
		initializeChecklist,
	};
}
