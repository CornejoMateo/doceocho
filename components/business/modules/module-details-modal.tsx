'use client';

import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { toast } from '@/components/ui/use-toast';
import { getModuleWorkLabel, ModuleStatusBadge } from '@/helpers/modules/modules-helper';
import { Module } from '@/lib/modules/modules';
import { deriveModuleStatusFromFiles } from '@/lib/modules/modules-files';
import { getSupabaseClient } from '@/lib/supabase-client';
import { translateError } from '@/lib/error-translator';
import { formatDate, FileViewerItem } from '@/utils/file-upload-utils';
import { ClipboardCheck, Pencil, Trash2 } from 'lucide-react';
import { useModuleDetailsFiles, ModuleFileWithUrl } from '@/hooks/modules/use-module-details-files';
import { useModuleAdminReview } from '@/hooks/modules/use-module-admin-review';
import { useModuleFileCorrection } from '@/hooks/modules/use-module-file-correction';
import { ModuleFilesSection } from './module-files-section';
import { ModuleAdminResponseSection } from './module-admin-response-section';
import { ModuleAmountDialog } from './module-amount-dialog';

interface ModuleDetailsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	module: Module | null;
	canReview?: boolean;
	onEdit?: (module: Module) => void;
	onDelete?: (module: Module) => void;
	onReviewed?: () => void;
}

export function ModuleDetailsModal({
	open,
	onOpenChange,
	module,
	canReview = false,
	onEdit,
	onDelete,
	onReviewed,
}: ModuleDetailsModalProps) {
	const moduleId = module?.id ?? null;

	const { files, isLoading, error, reload, patchFile, replaceFile } = useModuleDetailsFiles({
		open,
		moduleId,
	});
	const review = useModuleAdminReview({
		open,
		module,
		files,
		patchFile,
		onReviewed,
		onOpenChange,
	});
	const correction = useModuleFileCorrection({
		open,
		moduleId,
		files,
		patchFile,
		replaceFile,
		onReviewed,
	});

	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	useEffect(() => {
		if (!open) setSelectedIndex(null);
	}, [open]);

	if (!module) return null;

	const hasAdminResponded = module.status === 'approved' || module.status === 'rejected';

	const hasUnsyncedFileChanges =
		hasAdminResponded && files.length > 0 && deriveModuleStatusFromFiles(files) !== module.status;

	const derivedModuleStatus =
		canReview || hasAdminResponded
			? files.length === 0
				? (module.status ?? 'not_send')
				: deriveModuleStatusFromFiles(files)
			: (module.status ?? 'not_send');

	const viewerFiles: FileViewerItem[] = files.map((f) => ({
		id: f.id,
		url: f.url,
		name: f.file_name || 'Archivo',
		displayName: f.file_name || 'Archivo',
		description: f.description || null,
		mimetype: f.fileType || null,
		size: f.size ?? null,
	}));

	const handleDownload = async (file: ModuleFileWithUrl) => {
		try {
			const { data: blob } = await getSupabaseClient()
				.storage.from('modules')
				.download(file.storage_path);
			if (!blob) {
				toast({
					variant: 'destructive',
					title: 'No se pudo descargar',
					description: 'El archivo no está disponible en el servidor.',
				});
				return;
			}
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = file.file_name || 'archivo';
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 0);
		} catch (err) {
			toast({
				variant: 'destructive',
				title: 'No se pudo descargar',
				description: translateError(err) || 'Ocurrió un error al descargar el archivo.',
			});
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="min-w-0 w-[95vw] sm:max-w-3xl max-h-[92dvh] overflow-y-auto p-4 md:p-6">
					<DialogHeader className="text-left">
						<DialogTitle className="text-lg md:text-xl">{module.title || 'Módulo'}</DialogTitle>
						<DialogDescription className="text-sm">
							Detalles del módulo y sus archivos.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 min-w-0">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<ModuleStatusBadge status={derivedModuleStatus} />
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							{module.created_at && (
								<span className="text-sm text-muted-foreground">
									{formatDate(module.created_at)}
								</span>
							)}
						</div>

						<div className="space-y-2 text-sm">
							<p>
								<span className="font-medium text-foreground">Obra: </span>
								<span className="text-muted-foreground">{getModuleWorkLabel(module)}</span>
							</p>
							{module.description && (
								<p>
									<span className="font-medium text-foreground">Descripción: </span>
									<span className="text-muted-foreground whitespace-pre-wrap">
										{module.description}
									</span>
								</p>
							)}
						</div>

						{!canReview && hasAdminResponded && module.admin_description && (
							<div className="flex flex-col gap-1 rounded-md border bg-muted/40 p-3">
								<span className="flex items-center gap-2 text-sm font-medium text-foreground">
									<ClipboardCheck className="h-4 w-4 shrink-0" />
									Respuesta del administrador
								</span>
								<p className="text-sm text-muted-foreground whitespace-pre-wrap">
									{module.admin_description}
								</p>
							</div>
						)}

						<div className="grid gap-2">
							<ModuleFilesSection
								error={error}
								isLoading={isLoading}
								files={files}
								canReview={canReview}
								hasAdminResponded={hasAdminResponded}
								onOpenViewer={setSelectedIndex}
								onDownload={handleDownload}
								onRetry={reload}
								review={review}
								correction={correction}
							/>

							{canReview && files.length > 0 && (
								<ModuleAdminResponseSection
									moduleReviewText={review.moduleReviewText}
									onModuleReviewTextChange={review.setModuleReviewText}
									isSubmitting={review.isSubmittingModuleReview}
									allFilesReviewed={review.allFilesReviewed}
									hasPendingReviews={review.pendingReviewIds.size > 0}
									hasAdminResponded={hasAdminResponded}
									hasUnsyncedFileChanges={hasUnsyncedFileChanges}
									onSendResponse={review.handleSendResponseClick}
								/>
							)}
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
						{onEdit && (
							<Button
								type="button"
								variant="outline"
								className="w-full sm:w-auto"
								onClick={() => onEdit(module)}
							>
								<Pencil className="h-4 w-4 mr-2" />
								Editar
							</Button>
						)}
						{onDelete && (
							<Button
								type="button"
								variant="destructive"
								className="w-full sm:w-auto"
								onClick={() => onDelete(module)}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Eliminar
							</Button>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<FileViewerModal
				files={viewerFiles}
				selectedIndex={selectedIndex}
				onSelectedIndexChange={setSelectedIndex}
			/>

			<ModuleAmountDialog
				open={review.amountModalOpen}
				value={review.amountValue}
				error={review.amountError}
				isSubmitting={review.isSubmittingModuleReview}
				isLoadingDefault={review.loadingDefaultPrice}
				onValueChange={review.changeAmountValue}
				onCancel={review.cancelAmountModal}
				onConfirm={review.confirmAmountAndSubmit}
			/>
		</>
	);
}
