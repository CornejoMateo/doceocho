'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ModuleStatusBadge, statusBackgroundClass } from '@/helpers/modules/modules-helper';
import { ModuleFileWithUrl } from '@/hooks/modules/use-module-details-files';
import {
	AlertTriangle,
	Check,
	ClipboardCheck,
	Download,
	Loader2,
	Upload,
	X as XIcon,
	Video,
	FileText,
} from 'lucide-react';

export interface ModuleReviewPanelState {
	reviewingFileId: number | null;
	reviewText: string;
	pendingReviewIds: Map<number, 'approved' | 'rejected'>;
	setReviewText: (value: string) => void;
	startFileReview: (fileId: number) => void;
	cancelFileReview: () => void;
	submitFileReview: (file: ModuleFileWithUrl, status: 'approved' | 'rejected') => void;
}

export interface ModuleCorrectionPanelState {
	correctingFileId: number | null;
	correctionDescription: string;
	correctionFile: File | null;
	isSavingCorrection: boolean;
	isResubmittingAll: boolean;
	setCorrectionDescription: (value: string) => void;
	setCorrectionFile: (file: File | null) => void;
	startFileCorrection: (file: ModuleFileWithUrl) => void;
	cancelFileCorrection: () => void;
	saveFileCorrection: (file: ModuleFileWithUrl) => void;
	resubmitAllRejectedFiles: () => void;
}

interface ModuleFileItemProps {
	file: ModuleFileWithUrl;
	index: number;
	canReview: boolean;
	hasAdminResponded: boolean;
	onOpenViewer: (index: number) => void;
	onDownload: (file: ModuleFileWithUrl) => void;
	review: ModuleReviewPanelState;
	correction: ModuleCorrectionPanelState;
}

export function ModuleFileItem({
	file,
	index,
	canReview,
	hasAdminResponded,
	onOpenViewer,
	onDownload,
	review,
	correction,
}: ModuleFileItemProps) {
	const content = (
		<>
			<span className="block h-14 w-14 shrink-0 rounded-md overflow-hidden bg-muted">
				{file.url && file.isImg ? (
					<img
						src={file.url}
						alt={file.file_name || 'Archivo'}
						className="w-full h-full object-cover"
					/>
				) : file.url && file.isVid ? (
					<span className="w-full h-full flex items-center justify-center bg-black">
						<video src={file.url} className="w-full h-full object-cover" muted playsInline />
					</span>
				) : (
					<span className="w-full h-full flex items-center justify-center text-muted-foreground">
						{file.isVid ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
					</span>
				)}
			</span>
			<span className="flex flex-col min-w-0 flex-1 gap-0.5">
				<span className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-medium truncate">{file.file_name || 'Archivo'}</span>
					{canReview && (
						<ModuleStatusBadge
							status={file.status ?? 'pending'}
							className="text-[10px] px-1.5 py-0"
						/>
					)}
				</span>
				{file.description ? (
					<span className="text-xs text-muted-foreground whitespace-pre-wrap">
						{file.description}
					</span>
				) : (
					<span className="text-xs text-muted-foreground/60 italic">Sin descripción</span>
				)}
				{file.admin_description &&
					(canReview || hasAdminResponded) &&
					!(!canReview && file.status === 'rejected') && (
						<span className="text-xs text-foreground/80 whitespace-pre-wrap">
							<span className="font-medium">
								{file.status === 'rejected' ? 'Motivo de rechazo: ' : 'Descripción del Admin: '}
							</span>
							{file.admin_description}
						</span>
					)}
			</span>
		</>
	);

	return (
		<div className="flex flex-col gap-2">
			<div
				className={`group flex items-center gap-3 rounded-lg border p-2 hover:ring-2 ring-primary transition-all ${statusBackgroundClass}`}
			>
				{file.url ? (
					<button
						type="button"
						onClick={() => onOpenViewer(index)}
						className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
					>
						{content}
					</button>
				) : (
					<div className="flex items-center gap-3 min-w-0 flex-1 text-left">{content}</div>
				)}
				{!file.url && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="shrink-0"
						title="Descargar archivo"
						onClick={() => onDownload(file)}
					>
						<Download className="h-4 w-4" />
					</Button>
				)}
				{canReview &&
					review.reviewingFileId !== file.id &&
					!review.pendingReviewIds.has(file.id) && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 shrink-0 gap-1 text-xs"
							aria-label="Iniciar revisión del archivo"
							onClick={(e) => {
								e.stopPropagation();
								review.startFileReview(file.id);
							}}
						>
							<ClipboardCheck className="h-3.5 w-3.5" />
							Revisar
						</Button>
					)}
			</div>

			{canReview && review.reviewingFileId === file.id && (
				<div
					className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3"
					onClick={(e) => e.stopPropagation()}
				>
					<Textarea
						placeholder="Motivo (opcional)"
						value={review.reviewText}
						onChange={(e) => review.setReviewText(e.target.value)}
						disabled={review.pendingReviewIds.has(file.id)}
						className="bg-background"
						rows={2}
					/>
					<div className="flex flex-nowrap overflow-x-auto col-span-3 items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="shrink-0"
							onClick={review.cancelFileReview}
							disabled={review.pendingReviewIds.has(file.id)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							className="gap-1 shrink-0"
							onClick={() => review.submitFileReview(file, 'rejected')}
							disabled={review.pendingReviewIds.has(file.id)}
						>
							{review.pendingReviewIds.get(file.id) === 'rejected' ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<XIcon className="h-4 w-4" />
							)}
							Rechazar
						</Button>
						<Button
							type="button"
							size="sm"
							className="gap-1 shrink-0"
							onClick={() => review.submitFileReview(file, 'approved')}
							disabled={review.pendingReviewIds.has(file.id)}
						>
							{review.pendingReviewIds.get(file.id) === 'approved' ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Check className="h-4 w-4" />
							)}
							Aprobar
						</Button>
					</div>
				</div>
			)}

			{!canReview && hasAdminResponded && file.status === 'rejected' && (
				<div
					className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex items-start gap-2">
						<AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
						<div className="min-w-0">
							<p className="text-sm font-medium text-destructive">Archivo rechazado</p>
							<p className="text-xs text-foreground/80 whitespace-pre-wrap">
								{file.admin_description
									? file.admin_description
									: 'El administrador rechazó este archivo sin especificar un motivo.'}
							</p>
						</div>
					</div>

					{correction.correctingFileId === file.id ? (
						<div className="flex flex-col gap-2">
							<label className="text-xs font-medium text-foreground">
								Reemplazar imagen/video (opcional)
							</label>
							<input
								type="file"
								accept="image/*,video/*"
								disabled={correction.isSavingCorrection}
								onChange={(e) => correction.setCorrectionFile(e.target.files?.[0] ?? null)}
								className="text-xs text-muted-foreground file:mr-2 file:rounded-md file:border file:bg-background file:px-2 file:py-1 file:text-xs"
							/>
							<Textarea
								placeholder="Descripción"
								value={correction.correctionDescription}
								onChange={(e) => correction.setCorrectionDescription(e.target.value)}
								disabled={correction.isSavingCorrection}
								className="bg-background"
								rows={2}
							/>
							<div className="flex flex-wrap items-center justify-end gap-2">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={correction.cancelFileCorrection}
									disabled={correction.isSavingCorrection}
								>
									Cancelar
								</Button>
								<Button
									type="button"
									size="sm"
									className="gap-1"
									onClick={() => correction.saveFileCorrection(file)}
									disabled={correction.isSavingCorrection}
								>
									{correction.isSavingCorrection ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Check className="h-4 w-4" />
									)}
									Guardar cambios
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-wrap items-center justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-1"
								onClick={() => correction.startFileCorrection(file)}
								disabled={correction.isResubmittingAll}
							>
								<Upload className="h-3.5 w-3.5" />
								Corregir archivo
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
