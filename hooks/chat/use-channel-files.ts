'use client';

import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	deleteChannelFile,
	getChannelFileSignedUrl,
	listChannelFiles,
	uploadChannelFile,
	type ChannelFilesCursor,
} from '@/lib/chat/channel-files';
import type { ChannelFile } from '@/lib/chat/chat-types';

export function useChannelFiles(channelId: number | null, currentUserId: string | null) {
	const { toast } = useToast();

	const [files, setFiles] = useState<ChannelFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);

	const cursorRef = useRef<ChannelFilesCursor | null>(null);
	const requestIdRef = useRef(0);
	const loadedChannelRef = useRef<number | null>(null);

	const load = useCallback(async (targetChannelId: number, replace: boolean) => {
		const requestId = ++requestIdRef.current;
		if (replace) setLoading(true);
		else setLoadingMore(true);
		setError(null);

		const { data, error: fetchError } = await listChannelFiles(
			targetChannelId,
			replace ? null : cursorRef.current
		);

		// Channel changed (or a newer request started) while this one was in flight.
		if (requestId !== requestIdRef.current) return;

		if (fetchError || !data) {
			const message = translateError(fetchError) || 'No se pudieron cargar los archivos.';
			setError(message);
			setLoading(false);
			setLoadingMore(false);
			return;
		}

		setFiles((current) => (replace ? data.files : [...current, ...data.files]));
		cursorRef.current = data.nextCursor;
		setHasMore(data.hasMore);
		loadedChannelRef.current = targetChannelId;
		setLoading(false);
		setLoadingMore(false);
	}, []);

	// Lazy load: only fetches the first page the first time a channel's files tab is opened.
	const ensureLoaded = useCallback(
		(targetChannelId: number) => {
			if (loadedChannelRef.current === targetChannelId) return;
			cursorRef.current = null;
			setFiles([]);
			void load(targetChannelId, true);
		},
		[load]
	);

	const loadMore = useCallback(() => {
		if (!channelId || loadingMore || !hasMore) return;
		void load(channelId, false);
	}, [channelId, hasMore, loadingMore, load]);

	const upload = useCallback(
		async (file: File) => {
			if (!channelId || !currentUserId) return;

			setUploading(true);
			const { data, error: uploadError } = await uploadChannelFile(channelId, file, currentUserId);
			setUploading(false);

			if (uploadError || !data) {
				const message =
					typeof uploadError === 'string'
						? uploadError
						: translateError(uploadError) || 'No se pudo subir el archivo.';
				toast({ variant: 'destructive', title: 'Error al subir archivo', description: message });
				return;
			}

			setFiles((current) => [data, ...current]);
			toast({ title: 'Archivo subido', description: `${data.file_name} se subió correctamente.` });
		},
		[channelId, currentUserId, toast]
	);

	const remove = useCallback(
		async (file: ChannelFile) => {
			const { success, error: deleteError } = await deleteChannelFile(file);

			if (!success) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar archivo',
					description: translateError(deleteError) || 'No se pudo eliminar el archivo.',
				});
				return;
			}

			setFiles((current) => current.filter((f) => f.id !== file.id));
			toast({ title: 'Archivo eliminado' });
		},
		[toast]
	);

	const downloadFile = useCallback(
		async (file: ChannelFile) => {
			const { url, error: urlError } = await getChannelFileSignedUrl(
				file.storage_path,
				file.file_name
			);

			if (!url) {
				toast({
					variant: 'destructive',
					title: 'Error al descargar archivo',
					description: translateError(urlError) || 'No se pudo generar el enlace del archivo.',
				});
				return;
			}

			const link = document.createElement('a');
			link.href = url;
			link.download = file.file_name;
			link.rel = 'noopener noreferrer';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		},
		[toast]
	);

	const reset = useCallback(() => {
		requestIdRef.current += 1;
		cursorRef.current = null;
		loadedChannelRef.current = null;
		setFiles([]);
		setHasMore(false);
		setLoading(false);
		setLoadingMore(false);
		setError(null);
	}, []);

	return {
		files,
		loading,
		loadingMore,
		uploading,
		error,
		hasMore,
		ensureLoaded,
		loadMore,
		upload,
		remove,
		downloadFile,
		reset,
	};
}
