'use client';

import { useCallback, useEffect, useState } from 'react';
import { listModuleFiles, ModuleFile } from '@/lib/modules/modules-files';
import { getSupabaseClient } from '@/lib/supabase-client';
import { translateError } from '@/lib/error-translator';
import { getFileKind, isImage, isVideo } from '@/utils/file-upload-utils';
import { isSkpFileName } from '@/utils/skp-thumbnail';

export type ModuleFileWithUrl = ModuleFile & {
	url: string;
	isImg: boolean;
	isVid: boolean;
	isSkp: boolean;
	fileType: string;
	size?: number;
	blob?: Blob;
};

interface UseModuleDetailsFilesOptions {
	open: boolean;
	moduleId: number | null;
}

export function useModuleDetailsFiles({ open, moduleId }: UseModuleDetailsFilesOptions) {
	const [files, setFiles] = useState<ModuleFileWithUrl[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		if (!open || !moduleId) return;

		let cancelled = false;
		setIsLoading(true);
		setError(null);

		const loadFiles = async () => {
			setFiles((prev) => {
				prev.forEach((f) => {
					if (f.url) URL.revokeObjectURL(f.url);
				});
				return prev;
			});

			const { data, error } = await listModuleFiles(moduleId);

			if (cancelled) return;
			if (error) {
				setError(translateError(error) || 'No se pudieron cargar los archivos del módulo.');
				setFiles([]);
				setIsLoading(false);
				return;
			}

			const supabase = getSupabaseClient();
			const withUrls = await Promise.all(
				(data ?? []).map(async (file) => {
					try {
						const { data: blob } = await supabase.storage
							.from('modules')
							.download(file.storage_path);
						const contentType = blob?.type || '';
						const sourceName = file.file_name || file.storage_path;
						const kind = getFileKind(sourceName);
						const fileType =
							contentType ||
							(kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : '');
						return {
							...file,
							url: blob ? URL.createObjectURL(blob) : '',
							blob: blob ?? undefined,
							isImg: isImage(contentType) || kind === 'image',
							isVid: isVideo(contentType) || kind === 'video',
							isSkp: isSkpFileName(file.storage_path),
							fileType,
							size: blob?.size,
						} as ModuleFileWithUrl;
					} catch (err) {
						setError('Error al descargar el archivo: ' + (err as Error).message);
						return {
							...file,
							url: '',
							isImg: false,
							isVid: false,
							isSkp: isSkpFileName(file.storage_path),
							fileType: '',
						} as ModuleFileWithUrl;
					}
				})
			);

			if (cancelled) {
				withUrls.forEach((file) => {
					if (file.url) URL.revokeObjectURL(file.url);
				});
				return;
			}

			setFiles(withUrls);
			setIsLoading(false);
		};

		loadFiles();

		return () => {
			cancelled = true;
		};
	}, [open, moduleId, reloadKey]);

	useEffect(() => {
		if (!open) {
			setFiles((prev) => {
				prev.forEach((f) => {
					if (f.url) URL.revokeObjectURL(f.url);
				});
				return [];
			});
		}
	}, [open]);

	const reload = useCallback(() => setReloadKey((k) => k + 1), []);

	const patchFile = useCallback((id: number, patch: Partial<ModuleFileWithUrl>) => {
		setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
	}, []);

	// Updates a file's content in place (same id - the row is UPDATEd, never deleted/recreated).
	const replaceFile = useCallback(async (id: number, updatedFile: ModuleFile) => {
		const supabase = getSupabaseClient();
		let url = '';
		let isImg = false;
		let isVid = false;
		const isSkp = isSkpFileName(updatedFile.storage_path);
		let fileType = '';
		let size: number | undefined;
		let fileBlob: Blob | undefined;

		try {
			const { data: blob } = await supabase.storage
				.from('modules')
				.download(updatedFile.storage_path);
			const contentType = blob?.type || '';
			const sourceName = updatedFile.file_name || updatedFile.storage_path;
			const kind = getFileKind(sourceName);
			url = blob ? URL.createObjectURL(blob) : '';
			fileBlob = blob ?? undefined;
			isImg = isImage(contentType) || kind === 'image';
			isVid = isVideo(contentType) || kind === 'video';
			fileType =
				contentType || (kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : '');
			size = blob?.size;
		} catch (err) {
			setError('Error al descargar el archivo: ' + (err as Error).message);
		}

		setFiles((prev) => {
			const old = prev.find((f) => f.id === id);
			if (old?.url) URL.revokeObjectURL(old.url);
			return prev.map((f) =>
				f.id === id
					? ({
							...updatedFile,
							url,
							blob: fileBlob,
							isImg,
							isVid,
							isSkp,
							fileType,
							size,
						} as ModuleFileWithUrl)
					: f
			);
		});
	}, []);

	return { files, isLoading, error, reload, patchFile, replaceFile };
}
