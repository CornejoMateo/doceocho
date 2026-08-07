import { useState, useCallback } from 'react';
import { createWork, deleteWork, getWorksByClientId, updateWork } from '@/lib/works/works';
import { Work } from '@/lib/works/works';
import { createWorkAction } from '@/actions/works/create-work';

export function useClientWorks(clientId?: number) {
	const [works, setWorks] = useState<Work[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const loadWorks = useCallback(async () => {
		if (!clientId) return;

		setIsLoading(true);
		try {
			const { data, error } = await getWorksByClientId(clientId);
			if (error) throw error;
			setWorks(data || []);
		} catch (error) {
			console.error(error);
			setWorks([]);
		} finally {
			setIsLoading(false);
		}
	}, [clientId]);

	const create = async (workData: Omit<Work, 'id' | 'created_at' | 'client_id'>) => {
		if (!clientId) return;

		const { error } = await createWorkAction({
			...workData,
			client_id: clientId,
		});

		if (error) throw error;

		await loadWorks();
	};

	const remove = async (workId: number) => {
		const { error } = await deleteWork(workId);
		if (error) throw error;

		await loadWorks();
	};

	const update = async (workId: number, updates: Partial<Work>) => {
		const { data, error } = await updateWork(workId, updates);
		if (error) throw error;

		setWorks((prev) =>
			prev.map((work) => (work.id === workId ? ({ ...work, ...data, ...updates } as Work) : work))
		);

		return data;
	};

	return { works, isLoading, loadWorks, create, remove, update };
}
