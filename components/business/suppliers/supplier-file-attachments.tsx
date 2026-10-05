'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Download, Trash2, Upload, Paperclip } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { formatShortDate } from '@/utils/format-date';
import {
	listFilesByPurchaseSupplierId,
	uploadFilePurchaseSupplier,
	downloadFilePurchaseSupplier,
	deleteFilePurchaseSupplier,
} from '@/lib/suppliers/files-purchases-suppliers';
import {
	listFilesByPaymentSupplierId,
	uploadFilePaymentSupplier,
	downloadFilePaymentSupplier,
	deleteFilePaymentSupplier,
} from '@/lib/suppliers/files-payments-suppliers';

// I'm defining the types here since they don't belong to either the payment files or the purchase files
type SupplierFile = {
	id: number;
	created_at: string;
	storage_path: string;
	file_name: string | null;
	description: string | null;
};

export type StagedFile = {
	id: string;
	file: File;
	fileName: string;
	previewUrl?: string;
};

interface SupplierFileAttachmentsProps {
	kind: 'purchase' | 'payment';
	entityId?: number;
	staged?: StagedFile[];
	onStagedChange?: (files: StagedFile[]) => void;
}

export function SupplierFileAttachments({
	kind,
	entityId,
	staged,
	onStagedChange,
}: SupplierFileAttachmentsProps) {
	const { toast } = useToast();
	const isStagedMode = entityId === undefined;
	const [files, setFiles] = useState<SupplierFile[]>([]);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [downloadingId, setDownloadingId] = useState<number | null>(null);
	const [fileToDelete, setFileToDelete] = useState<SupplierFile | StagedFile | null>(null);
	const [deleting, setDeleting] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const fetchFiles = async () => {
		if (entityId === undefined) return;
		setLoading(true);
		try {
			const { data, error } =
				kind === 'purchase'
					? await listFilesByPurchaseSupplierId(entityId)
					: await listFilesByPaymentSupplierId(entityId);
			if (error) throw error;
			setFiles(data ?? []);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron cargar los archivos adjuntos.',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (entityId === undefined) return;
		void fetchFiles();
	}, [kind, entityId]);

	const heldPreviewUrls = useRef(new Set<string>());
	const previewSignature = (staged ?? [])
		.map((entry) => (entry.previewUrl ? `${entry.id}:${entry.previewUrl}` : ''))
		.join('|');

	useEffect(() => {
		const held = heldPreviewUrls.current;
		const next = new Set(
			(staged ?? []).map((entry) => entry.previewUrl).filter((url): url is string => !!url)
		);
		for (const url of held) {
			if (!next.has(url)) {
				URL.revokeObjectURL(url);
				held.delete(url);
			}
		}
	}, [previewSignature, staged]);

	useEffect(() => {
		return () => {
			for (const url of heldPreviewUrls.current) URL.revokeObjectURL(url);
			heldPreviewUrls.current = new Set();
		};
	}, []);

	const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (isStagedMode) {
			// Only images get a preview: an objectURL for a PDF or video is
			// dead weight the browser holds for the life of the entry.
			const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
			if (previewUrl) heldPreviewUrls.current.add(previewUrl);
			onStagedChange?.([
				...(staged ?? []),
				{ id: crypto.randomUUID(), file, fileName: file.name, previewUrl },
			]);
			if (inputRef.current) inputRef.current.value = '';
			return;
		}
		setUploading(true);
		try {
			const { error } =
				kind === 'purchase'
					? await uploadFilePurchaseSupplier(entityId, file)
					: await uploadFilePaymentSupplier(entityId, file);
			if (error) throw error;
			toast({ title: 'Archivo adjuntado' });
			await fetchFiles();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo adjuntar el archivo.',
				variant: 'destructive',
			});
		} finally {
			setUploading(false);
			if (inputRef.current) inputRef.current.value = '';
		}
	};

	const handleDownload = async (file: SupplierFile) => {
		setDownloadingId(file.id);
		try {
			const { data: blob, error } =
				kind === 'purchase'
					? await downloadFilePurchaseSupplier(file.id)
					: await downloadFilePaymentSupplier(file.id);
			if (error || !blob) {
				throw error ?? new Error('El archivo no está disponible.');
			}
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = file.file_name || 'archivo';
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 0);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo descargar el archivo.',
				variant: 'destructive',
			});
		} finally {
			setDownloadingId(null);
		}
	};

	const confirmDelete = async () => {
		if (!fileToDelete) return;
		if (isStagedMode) {
			const stagedId = (fileToDelete as StagedFile).id;
			onStagedChange?.((staged ?? []).filter((entry) => entry.id !== stagedId));
			setFileToDelete(null);
			return;
		}
		setDeleting(true);
		try {
			const { success, error } =
				kind === 'purchase'
					? await deleteFilePurchaseSupplier((fileToDelete as SupplierFile).id)
					: await deleteFilePaymentSupplier((fileToDelete as SupplierFile).id);
			if (!success) throw error;
			toast({ title: 'Archivo eliminado' });
			await fetchFiles();
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

	const pendingFileName =
		fileToDelete === null
			? 'seleccionado'
			: 'fileName' in fileToDelete
				? fileToDelete.fileName
				: fileToDelete.file_name || 'seleccionado';

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-medium">Archivos adjuntos</Label>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-2"
					disabled={uploading}
					onClick={() => inputRef.current?.click()}
				>
					<Upload className="h-4 w-4" />
					{uploading ? 'Subiendo...' : 'Adjuntar'}
				</Button>
				<input ref={inputRef} type="file" className="hidden" onChange={handleFileSelected} />
			</div>

			{loading ? (
				<p className="text-sm text-muted-foreground">Cargando archivos...</p>
			) : isStagedMode ? (
				(staged ?? []).length === 0 ? (
					<p className="text-sm text-muted-foreground">No hay archivos para adjuntar.</p>
				) : (
					<ul className="space-y-1">
						{(staged ?? []).map((entry) => (
							<li
								key={entry.id}
								className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
							>
								<span className="flex min-w-0 items-center gap-2">
									<Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
									{entry.previewUrl ? (
										<img
											src={entry.previewUrl}
											alt={entry.fileName}
											className="h-8 w-8 shrink-0 rounded object-cover"
										/>
									) : null}
									<span className="truncate">{entry.fileName}</span>
								</span>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Eliminar"
									title="Eliminar"
									className="shrink-0 text-destructive"
									onClick={() => setFileToDelete(entry)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</li>
						))}
					</ul>
				)
			) : files.length === 0 ? (
				<p className="text-sm text-muted-foreground">No hay archivos adjuntos.</p>
			) : (
				<ul className="space-y-1">
					{files.map((file) => (
						<li
							key={file.id}
							className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
						>
							<span className="flex min-w-0 items-center gap-2">
								<Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="truncate">{file.file_name || 'Archivo'}</span>
								<span className="shrink-0 text-xs text-muted-foreground">
									{formatShortDate(file.created_at)}
								</span>
							</span>
							<span className="flex shrink-0 gap-1">
								<Button
									variant="ghost"
									size="sm"
									aria-label="Descargar"
									title="Descargar"
									disabled={downloadingId === file.id}
									onClick={() => handleDownload(file)}
								>
									<Download className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									aria-label="Eliminar"
									title="Eliminar"
									className="text-destructive"
									onClick={() => setFileToDelete(file)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</span>
						</li>
					))}
				</ul>
			)}

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
