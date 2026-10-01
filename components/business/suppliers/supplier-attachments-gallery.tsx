'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
	listFilesWithUrlsByPurchaseSupplierId,
	deleteFilePurchaseSupplier,
} from '@/lib/suppliers/files-purchases-suppliers';
import {
	listFilesWithUrlsByPaymentSupplierId,
	deleteFilePaymentSupplier,
} from '@/lib/suppliers/files-payments-suppliers';
import { FileViewerItem, formatFileSize } from '@/utils/file-upload-utils';

interface SupplierAttachmentsGalleryProps {
	kind: 'purchase' | 'payment';
	entityId: number;
	label?: string;
	onCountChange?: (count: number) => void;
}

export function SupplierAttachmentsGallery({
	kind,
	entityId,
	label,
	onCountChange,
}: SupplierAttachmentsGalleryProps) {
	const { toast } = useToast();
	const [files, setFiles] = useState<FileViewerItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
	const [fileToDelete, setFileToDelete] = useState<FileViewerItem | null>(null);
	const [deleting, setDeleting] = useState(false);
	const blobUrlsRef = useRef<string[]>([]);

	const requestIdRef = useRef(0);

	const revokeBlobUrls = useCallback((urls: string[]) => {
		urls.forEach((url) => URL.revokeObjectURL(url));
	}, []);

	const loadFiles = useCallback(async () => {
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		const isCurrent = () => requestIdRef.current === requestId;

		setLoading(true);
		let next: FileViewerItem[] | null = null;
		try {
			const { data, error } =
				kind === 'purchase'
					? await listFilesWithUrlsByPurchaseSupplierId(entityId)
					: await listFilesWithUrlsByPaymentSupplierId(entityId);

			if (error) throw error;
			next = data ?? [];
		} catch (error) {
			if (isCurrent()) {
				toast({
					title: 'Error',
					description: translateError(error) || 'No se pudieron cargar los archivos adjuntos.',
					variant: 'destructive',
				});
			}
			next = [];
		}
		if (!isCurrent()) {
			if (next) revokeBlobUrls(next.map((file) => file.url));
			return;
		}

		revokeBlobUrls(blobUrlsRef.current);
		blobUrlsRef.current = next.map((file) => file.url);
		setFiles(next);
		setLoading(false);
		onCountChange?.(next.length);
	}, [kind, entityId, revokeBlobUrls, toast]);

	useEffect(() => {
		void loadFiles();
		return () => {
			requestIdRef.current += 1;
		};
	}, [loadFiles]);

	useEffect(() => {
		return () => {
			revokeBlobUrls(blobUrlsRef.current);
			blobUrlsRef.current = [];
		};
	}, [revokeBlobUrls]);

	const confirmDelete = async () => {
		if (!fileToDelete) return;
		setDeleting(true);
		try {
			const { success, error } =
				kind === 'purchase'
					? await deleteFilePurchaseSupplier(fileToDelete.id)
					: await deleteFilePaymentSupplier(fileToDelete.id);
			if (!success) throw error;
			toast({ title: 'Archivo eliminado' });
			await loadFiles();
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
			) : files.length === 0 ? (
				<p className="text-xs text-muted-foreground">No hay archivos adjuntos.</p>
			) : (
				<div className="flex flex-wrap gap-1.5">
					{files.map((file, index) => {
						const displayName = file.displayName || file.name;
						const chipTitle = file.size
							? `${displayName} · ${formatFileSize(file.size)}`
							: displayName;
						return (
							<div key={file.id} className="relative inline-flex items-center">
								<button
									type="button"
									title={chipTitle}
									onClick={() => setSelectedFileIndex(index)}
									className="inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pr-6 pl-1.5 text-xs transition-colors hover:bg-muted"
								>
									{file.mimetype?.startsWith('image/') ? (
										<img
											src={file.url}
											alt={file.name}
											className="h-5 w-5 shrink-0 rounded-full object-cover"
										/>
									) : (
										<Paperclip
											className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
											aria-hidden="true"
										/>
									)}
									<span className="truncate">{displayName}</span>
								</button>
								<button
									type="button"
									aria-label="Eliminar archivo"
									title="Eliminar archivo"
									onClick={() => setFileToDelete(file)}
									className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
								>
									<Trash2 className="h-3 w-3" />
								</button>
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
							<span className="font-semibold">{pendingFileName}</span>.
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
