'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { translateError } from '@/lib/error-translator';
import { listSuppliers, Supplier } from '@/lib/suppliers/suppliers';

export function useSuppliers(enabled: boolean = true) {
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState<string | null>(null);
	const requestId = useRef(0);
	const hasLoaded = useRef(false);

	const refresh = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
		const id = ++requestId.current;
		const { data, error } = await listSuppliers();
		if (id !== requestId.current) return { ok: true }; // stale response
		if (error) {
			const message =
				translateError(error) || 'Ocurrió un error inesperado, por favor volvé a intentarlo.';
			if (!hasLoaded.current) setError(message);
			setLoading(false);
			return { ok: false, message };
		}
		hasLoaded.current = true;
		setError(null);
		setSuppliers(data ?? []);
		setLoading(false);
		return { ok: true };
	}, []);

	useEffect(() => {
		if (!enabled) return;
		setLoading(true);
		refresh();
	}, [enabled, refresh]);

	return { suppliers, loading, error, refresh };
}
