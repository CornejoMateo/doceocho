import { getSupabaseClient } from '@/lib/supabase-client';
import { useEffect, useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
	data: T[];
	timestamp: number;
	version: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const DEBOUNCE_DELAY = 300; // 300ms para agrupar actualizaciones

export function useOptimizedRealtime<T extends { id: number }>(
	table: string,
	fetchFromDb: () => Promise<T[]>,
	cacheKey?: string,
	isAuthorized?: boolean
) {
	if (table === 'users' && !isAuthorized) {
		return { data: [], loading: false, error: null, refresh: () => {} };
	}

	const [data, setData] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const supabase = getSupabaseClient();
	const fetchFromDbRef = useRef(fetchFromDb);

	const cacheKeyFinal = cacheKey || `realtime_${table}`;
	const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const versionRef = useRef(0);

	useEffect(() => {
		fetchFromDbRef.current = fetchFromDb;
	}, [fetchFromDb]);

	// Obtener datos del cache local
	const getCachedData = useCallback((): T[] | null => {
		try {
			const cached = localStorage.getItem(cacheKeyFinal);
			if (!cached) return null;

			const entry: CacheEntry<T> = JSON.parse(cached);
			const now = Date.now();

			// Verificar si el cache es válido
			if (now - entry.timestamp < CACHE_DURATION) {
				return entry.data;
			}

			// Cache expirado, eliminar
			localStorage.removeItem(cacheKeyFinal);
			return null;
		} catch {
			return null;
		}
	}, [cacheKeyFinal]);

	// Guardar datos en cache
	const setCachedData = useCallback(
		(newData: T[]) => {
			try {
				const entry: CacheEntry<T> = {
					data: newData,
					timestamp: Date.now(),
					version: versionRef.current,
				};
				localStorage.setItem(cacheKeyFinal, JSON.stringify(entry));
			} catch (error) {
				console.warn('Error al guardar cache:', error);
			}
		},
		[cacheKeyFinal]
	);

	// Fetch data with cache optimization
	const fetchData = useCallback(
		async (forceRefresh = false) => {
			let hadCache = false;
			let cachedIsEmpty = false;

			if (!forceRefresh) {
				const cached = getCachedData();
				if (cached !== null) {
					hadCache = true;
					cachedIsEmpty = cached.length === 0;
					setData(cached);
					// No block UI if there is cache, but revalidate in background.
					setLoading(false);
				}
			}

			// If there is cache with data, revalidate without spinner.
			// If there is no cache (or it's empty), show loading.
			if (!hadCache || cachedIsEmpty || forceRefresh) {
				setLoading(true);
			}
			setError(null);

			try {
				const res = await fetchFromDbRef.current();
				versionRef.current++;
				setData([...res]);
				setCachedData(res);
			} catch (err: any) {
				if (typeof err?.message === 'string' && err.message.trim().length > 0) {
					setError(err.message);
				} else {
					try {
						setError(JSON.stringify(err));
					} catch {
						setError('Error al cargar datos');
					}
				}
			} finally {
				setLoading(false);
			}
		},
		[getCachedData, setCachedData]
	);

	// Process individual changes without full refresh
	const processRealtimeEvent = useCallback(
		(payload: any) => {
			const { eventType, new: newRecord, old: oldRecord } = payload;

			// For tables that require joined relational data, do a full refresh on INSERT/UPDATE
			// to avoid incomplete realtime payloads without nested relations.
			if (
				(table === 'balances' || table === 'folder_budgets' || table === 'attendance_entries') &&
				(eventType === 'INSERT' || eventType === 'UPDATE')
			) {
				fetchData(true);
				return;
			}

			setData((currentData) => {
				let newData = [...currentData];

				switch (eventType) {
					case 'INSERT':
						// Add new record to the beginning
						if (newRecord) newData.unshift(newRecord);
						break;

					case 'UPDATE':
						// Update existing record
						if (newRecord?.id) {
							const index = newData.findIndex((item) => item.id === newRecord.id);
							if (index !== -1) {
								newData[index] = newRecord;
							}
						}
						break;

					case 'DELETE':
						// Remove record
						if (oldRecord?.id) {
							newData = newData.filter((item) => item.id !== oldRecord.id);
						}
						break;
				}

				// Update cache with debounce
				if (debounceTimerRef.current) {
					clearTimeout(debounceTimerRef.current);
				}

				debounceTimerRef.current = setTimeout(() => {
					setCachedData(newData);
				}, DEBOUNCE_DELAY);

				return newData;
			});
		},
		[setCachedData, table]
	);

	// Initialization
	useEffect(() => {
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only runs on mount

	// Realtime configuration
	useEffect(() => {
		if (!table) return;
		const channel = supabase
			.channel(`${table}-optimized-realtime`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table,
				},
				processRealtimeEvent
			)
			.subscribe();

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			supabase.removeChannel(channel);
		};
	}, [table, processRealtimeEvent]);

	// Clean expired cache periodically
	useEffect(() => {
		const interval = setInterval(() => {
			const cached = localStorage.getItem(cacheKeyFinal);
			if (cached) {
				try {
					const entry: CacheEntry<T> = JSON.parse(cached);
					if (Date.now() - entry.timestamp >= CACHE_DURATION) {
						localStorage.removeItem(cacheKeyFinal);
					}
				} catch {
					localStorage.removeItem(cacheKeyFinal);
				}
			}
		}, CACHE_DURATION);

		return () => clearInterval(interval);
	}, [cacheKeyFinal]);

	const refresh = useCallback(() => fetchData(true), [fetchData]);

	const invalidateCache = useCallback(() => {
		localStorage.removeItem(cacheKeyFinal);
		fetchData(true);
	}, [cacheKeyFinal, fetchData]);

	return {
		data,
		loading,
		error,
		refresh,
		invalidateCache,
	};
}
