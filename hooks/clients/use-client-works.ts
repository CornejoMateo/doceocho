import { useState, useCallback, useRef } from 'react';
import { createWork, deleteWork, getWorksByClientId, updateWork } from '@/lib/works/works';
import { Work } from '@/lib/works/works';

export function useClientWorks(clientId?: number) {
	const [works, setWorks] = useState<Work[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	// Incremented on every load/clear so responses from superseded requests are ignored
	const requestIdRef = useRef(0);

	const clearWorks = useCallback(() => {
		requestIdRef.current += 1;
		setWorks([]);
		setIsLoading(false);
	}, []);

	const loadWorks = useCallback(async () => {
		if (!clientId) return;

		const requestId = ++requestIdRef.current;
		setIsLoading(true);
		try {
			const { data, error } = await getWorksByClientId(clientId);
			if (error) throw error;
			if (requestId !== requestIdRef.current) return;
			setWorks(data || []);
		} catch (error) {
			console.error(error);
			if (requestId !== requestIdRef.current) return;
			setWorks([]);
		} finally {
			if (requestId === requestIdRef.current) setIsLoading(false);
		}
	}, [clientId]);

	const create = async (workData: Omit<Work, 'id' | 'created_at' | 'client_id'>) => {
		if (!clientId) return;

		// Dynamically import to avoid server-only dependencies in client components
		const { createWorkAction } = await import('@/actions/works/create-work');
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

	return { works, isLoading, loadWorks, clearWorks, create, remove, update };
}
