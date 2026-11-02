'use client';

import { EditOnly } from '@/components/permissions/edit-scope';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Paperclip, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	listFilesWithUrlsByExpenseId,
	deleteFileExpense,
	signUrlsForExpenseFiles,
	type FileExpense,
} from '@/lib/expenses/files-expenses';
import {
	listFilesWithUrlsByPaymentId,
	deleteFilePayment,
	signUrlsForPaymentFiles,
	type FilePayment,
} from '@/lib/payments/files-payments';
import { FileViewerItem, formatFileSize, getFileKind } from '@/utils/file-upload-utils';

interface AttachmentsGalleryProps {
	kind: 'expense' | 'payment';
	entityId: number;
	label?: string;
	onCountChange?: (count: number) => void;
	preloadedFiles?: FileExpense[] | FilePayment[];
	readOnly?: boolean;
	/** Permission key that governs deleting a file, e.g. "cash-flow" or "cash-flow.suppliers". */
	editKey: string;
}

export function AttachmentsGallery({
	kind,
	entityId,
	label,
	onCountChange,
	preloadedFiles,
	readOnly = false,
	editKey,
}: AttachmentsGalleryProps) {
	const { toast } = useToast();
	const [files, setFiles] = useState<FileViewerItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
	const [fileToDelete, setFileToDelete] = useState<FileViewerItem | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(new Set());
	const requestIdRef = useRef(0);

	const fetchFromEntity = useCallback(async () => {
		return kind === 'expense'
			? listFilesWithUrlsByExpenseId(entityId)
			: listFilesWithUrlsByPaymentId(entityId);
	}, [kind, entityId]);

	const loadFiles = useCallback(
		async (opts?: { skipPreload?: boolean }) => {
			const requestId = requestIdRef.current + 1;
			requestIdRef.current = requestId;
			const isCurrent = () => requestIdRef.current === requestId;

			setLoading(true);
			setLoadError(false);
			let next: FileViewerItem[] | null = null;
			let failed = false;
			try {
				const { data, error } =
					preloadedFiles && !opts?.skipPreload
						? kind === 'expense'
							? await signUrlsForExpenseFiles(preloadedFiles as FileExpense[])
							: await signUrlsForPaymentFiles(preloadedFiles as FilePayment[])
						: await fetchFromEntity();

				if (error) throw error;
				next = data ?? [];
			} catch (error) {
				failed = true;
				if (isCurrent()) {
					toast({
						title: 'Error',
						description: translateError(error) || 'No se pudieron cargar los archivos adjuntos.',
						variant: 'destructive',
					});
				}
				next = [];
			}
			if (!isCurrent()) return;
			setBrokenImageIds(new Set());
			setFiles(next);
			setLoading(false);
			setLoadError(failed);
			onCountChange?.(next.length);
		},
		[preloadedFiles, kind, fetchFromEntity, toast]
	);

	useEffect(() => {
		void loadFiles();
		return () => {
			requestIdRef.current += 1;
		};
	}, [loadFiles]);

	const confirmDelete = async () => {
		if (!fileToDelete) return;
		setDeleting(true);
		try {
			const { success, error } =
				kind === 'expense'
					? await deleteFileExpense(fileToDelete.id)
					: await deleteFilePayment(fileToDelete.id);
			if (!success) throw error;
			toast({ title: 'Archivo eliminado' });
			await loadFiles({ skipPreload: true });
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo eliminar el archivo.',
				variant: 'destructive',
			});
		} finally {
			setDeleting(false);
			setFileToDelete(null);
		}
	};

	const pendingFileName = fileToDelete
		? fileToDelete.displayName || fileToDelete.name
		: 'seleccionado';

	return (
		<div className="space-y-1.5">
			{label ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
			{loading ? (
				<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
					Cargando archivos...
				</p>
			) : loadError ? (
				<div className="flex flex-wrap items-center gap-2">
					<p className="text-xs text-muted-foreground">
						No se pudieron cargar los archivos adjuntos.
					</p>
					<button
						type="button"
						onClick={() => void loadFiles()}
						className="text-xs font-medium text-primary underline-offset-2 hover:underline"
					>
						Reintentar
					</button>
				</div>
			) : files.length === 0 ? (
				<p className="text-xs text-muted-foreground">No hay archivos adjuntos.</p>
			) : (
				<div className="flex flex-wrap gap-1.5">
					{files.map((file, index) => {
						const displayName = file.displayName || file.name;
						const chipTitle = file.size
							? `${displayName} · ${formatFileSize(file.size)}`
							: displayName;
						const showImage = getFileKind(file.name) === 'image' && !brokenImageIds.has(file.id);
						return (
							<div key={file.id} className="relative inline-flex items-center">
								<button
									type="button"
									title={chipTitle}
									onClick={() => setSelectedFileIndex(index)}
									className={`inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 ${readOnly ? 'pr-1.5' : 'pr-6'} pl-1.5 text-xs transition-colors hover:bg-muted`}
								>
									{showImage ? (
										<img
											src={file.url}
											alt={file.name}
											loading="lazy"
											className="h-5 w-5 shrink-0 rounded-full object-cover"
											onError={() => setBrokenImageIds((current) => new Set(current).add(file.id))}
										/>
									) : (
										<Paperclip
											className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
											aria-hidden="true"
										/>
									)}
									<span className="truncate">{displayName}</span>
								</button>
								{!readOnly && (
									<EditOnly edit={editKey}>
										<button
											type="button"
											aria-label="Eliminar archivo"
											title="Eliminar archivo"
											onClick={() => setFileToDelete(file)}
											className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
										>
											<Trash2 className="h-3 w-3" />
										</button>
									</EditOnly>
								)}
							</div>
						);
					})}
				</div>
			)}

			<FileViewerModal
				files={files}
				selectedIndex={selectedFileIndex}
				onSelectedIndexChange={setSelectedFileIndex}
			/>

			<AlertDialog
				open={!!fileToDelete}
				onOpenChange={(nextOpen) => {
					if (!nextOpen && !deleting) setFileToDelete(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. Se eliminará permanentemente el archivo{' '}
							<span className="break-all font-semibold [overflow-wrap:anywhere]">
								{pendingFileName}
							</span>
							.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								void confirmDelete();
							}}
							disabled={deleting}
							className="bg-destructive text-destructive-foreground"
						>
							{deleting ? 'Eliminando...' : 'Eliminar'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
