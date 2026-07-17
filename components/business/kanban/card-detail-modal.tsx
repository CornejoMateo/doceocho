import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
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
import { Upload, FileText, Trash2 } from 'lucide-react';
import { useCard } from '@/hooks/kanban/use-card';
import { translateError } from '@/lib/error-translator';
import { getSupabaseClient } from '@/lib/supabase-client';
import { toast } from '@/components/ui/use-toast';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { getFileExtension, isImage, isVideo } from '@/utils/file-upload-utils';
import { optimizeFile } from '@/utils/optimization-images';
import { CardForm, type CardFormHandle } from '@/components/business/kanban/card-form';
import { useAuth } from '@/components/provider/auth-provider';
import type { FileViewerItem } from '@/utils/file-upload-utils';
import type { KanbanFileRecord } from '@/components/business/kanban/types';
import { DialogDescription } from '@/components/ui/dialog';

interface CardDetailModalProps {
	cardId: number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCardDeleted?: () => void;
	onCardUpdated?: () => void;
}

export function CardDetailModal({
	cardId,
	open,
	onOpenChange,
	onCardDeleted,
	onCardUpdated,
}: CardDetailModalProps) {
	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	const { card, loading, error, updateCard, uploadFile, removeCard, removeAttachment } =
		useCard(cardId);
	const [isUploading, setIsUploading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isGalleryOpen, setIsGalleryOpen] = useState(false);
	const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
	const [fileUrls, setFileUrls] = useState<Record<number, string>>({});
	const [fileToDelete, setFileToDelete] = useState<KanbanFileRecord | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const galleryRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<CardFormHandle>(null);

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const uploadFiles = async (fileList: FileList | File[]) => {
		const files = Array.from(fileList);
		if (files.length === 0) return;

		setIsUploading(true);
		try {
			for (const file of files) {
				const optimized = await optimizeFile(file);
				const displayName = file.name.replace(/\.[^/.]+$/, '');
				const { error } = await uploadFile(optimized, displayName);
				if (error) {
					toast({
						variant: 'destructive',
						title: 'Error al subir archivo',
						description: translateError(error) || 'Ocurrió un error al subir el archivo.',
					});
				}
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error al subir archivos',
				description: translateError(error) || 'Ocurrió un error al subir los archivos.',
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		uploadFiles(e.dataTransfer.files);
	};

	function getFileName(path: string | null): string {
		return path ? path.split('/').pop() || 'Archivo' : 'Archivo';
	}

	useEffect(() => {
		const supabase = getSupabaseClient();
		let cancelled = false;

		async function loadUrls() {
			if (!card?.files) return;
			const filesToFetch = card.files.filter((f) => f.path && !fileUrls[f.id]);
			for (const file of filesToFetch) {
				const { data: blob, error } = await supabase.storage
					.from('kanban')
					.download(file.path as string);
				if (cancelled) return;
				if (blob) {
					setFileUrls((prev) => ({ ...prev, [file.id]: URL.createObjectURL(blob) }));
				} else if (error) {
					toast({
						variant: 'destructive',
						title: 'Error al cargar archivo',
						description: translateError(error) || 'Ocurrió un error al cargar el archivo.',
					});
				}
			}
		}

		loadUrls();

		return () => {
			cancelled = true;
		};
	}, [card?.files]);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		uploadFiles(files).then(() => {
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		});
	};

	const handleDeleteAttachment = async (attachmentId: number) => {
		const { error } = await removeAttachment(attachmentId);
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al eliminar archivo',
				description: translateError(error) || 'Ocurrió un error, intenta de nuevo.',
			});
		} else {
			toast({ title: 'Archivo eliminado correctamente' });
		}
	};

	if (!cardId) return null;

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(o) => {
					if (!o) formRef.current?.requestClose();
				}}
			>
				<DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<VisuallyHidden>
							<DialogTitle>Detalles de tarjeta</DialogTitle>
						</VisuallyHidden>
					</DialogHeader>

					<VisuallyHidden>
						<DialogDescription>
							Visualiza y edita los detalles de la tarjeta. También puedes ver y administrar los
							archivos adjuntos.
						</DialogDescription>
					</VisuallyHidden>

					{loading ? (
						<div className="text-center py-8 flex-1">
							<p className="text-muted-foreground">Cargando tarjeta...</p>
						</div>
					) : error ? (
						<div className="text-center py-8 flex-1">
							<p className="text-destructive">Error: {error}</p>
						</div>
					) : !card ? (
						<div className="text-center py-8 flex-1">
							<p className="text-muted-foreground">Tarjeta no encontrada</p>
						</div>
					) : (
						<CardForm
							ref={formRef}
							card={card}
							updateCard={updateCard}
							removeCard={removeCard}
							onClose={() => onOpenChange(false)}
							onSaveSuccess={onCardUpdated}
							onDeleteSuccess={() => {
								onCardDeleted?.();
								onOpenChange(false);
							}}
							onOpenGallery={() => setIsGalleryOpen(true)}
						/>
					)}
				</DialogContent>
			</Dialog>

			{/* Gallery Dialog */}
			<Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
				<DialogContent
					className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
					ref={galleryRef}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<DialogHeader>
						<VisuallyHidden>
							<DialogTitle>Archivos adjuntos</DialogTitle>
						</VisuallyHidden>
						<div className="flex items-center justify-between gap-4 mt-10">
							<h2 className="text-lg font-semibold">
								Archivos adjuntos ({card?.files?.length || 0})
							</h2>
							{isAuthorized && (
								<div className="flex items-center gap-2">
									<input
										ref={fileInputRef}
										type="file"
										multiple
										onChange={handleFileSelect}
										className="hidden"
									/>
									<Button
										size="sm"
										onClick={() => fileInputRef.current?.click()}
										disabled={isUploading || isDeleting}
									>
										<Upload className="h-4 w-4 mr-2" />
										{isUploading ? 'Subiendo...' : isDeleting ? 'Eliminando...' : 'Subir archivo'}
									</Button>
								</div>
							)}
						</div>
					</DialogHeader>
					<DialogDescription className="text-sm text-muted-foreground mb-4">
						Visualiza los archivos adjuntos de la tarjeta. Haz clic en un archivo para abrirlo en el
						visor.
					</DialogDescription>

					{!card?.files || card.files.length === 0 ? (
						isAuthorized && (
							<div
								className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/20 transition-colors"
								onClick={() => fileInputRef.current?.click()}
							>
								<div className="text-center">
									<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
									<p className="text-sm text-muted-foreground">
										No hay archivos. Haz clic para subir.
									</p>
								</div>
							</div>
						)
					) : (
						<div className="flex-1 overflow-y-auto">
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
								{card.files.map((attachment, index) => {
									const path = attachment.path;
									if (!path) return null;
									const fileName = getFileName(attachment.path);
									const ext = getFileExtension(path).toLowerCase();
									const mimetype =
										ext === 'mp4'
											? 'video/mp4'
											: ext === 'webm'
												? 'video/webm'
												: ext === 'mov'
													? 'video/quicktime'
													: ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
														? 'image/jpeg'
														: 'application/octet-stream';

									return (
										<div
											key={attachment.id}
											className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 ring-primary transition-all"
											onClick={() => setSelectedFileIndex(index)}
										>
											{isVideo(mimetype) ? (
												<div className="w-full h-full flex items-center justify-center bg-black">
													<video
														src={fileUrls[attachment.id]}
														className="w-full h-full object-cover"
														muted
														playsInline
													/>
													<div className="absolute inset-0 bg-black/20 flex items-center justify-center">
														<div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
															<div className="w-0 h-0 border-l-[12px] border-l-black border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1" />
														</div>
													</div>
												</div>
											) : isImage(mimetype) ? (
												<img
													src={fileUrls[attachment.id]}
													alt={attachment.displayName || fileName}
													className="w-full h-full object-cover"
												/>
											) : (
												<div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
													<FileText className="h-16 w-16 text-primary mb-2" />
													<p className="text-xs font-medium text-center text-foreground">
														{ext.toUpperCase()}
													</p>
												</div>
											)}

											{isAuthorized && (
												<div className="absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity">
													<Button
														size="icon"
														variant="destructive"
														className="h-7 w-7"
														aria-label="Eliminar archivo"
														onClick={(e) => {
															e.stopPropagation();
															setFileToDelete(attachment);
														}}
													>
														<Trash2 className="h-3 w-3" />
													</Button>
												</div>
											)}

											<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
												<p className="text-white text-xs truncate font-medium">
													{attachment.displayName || getFileName(attachment.path)}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. El archivo{' '}
							<strong>
								{fileToDelete ? fileToDelete.displayName || getFileName(fileToDelete.path) : ''}
							</strong>{' '}
							será eliminado permanentemente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setFileToDelete(null)}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								if (fileToDelete) {
									setIsDeleting(true);
									await handleDeleteAttachment(fileToDelete.id);
									setIsDeleting(false);
									setFileToDelete(null);
								}
							}}
							className="bg-destructive hover:bg-destructive/90"
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{isDragging && (
				<div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
					<div className="bg-primary/10 border-2 border-dashed border-primary rounded-xl p-8 backdrop-blur-sm">
						<Upload className="h-12 w-12 mx-auto mb-3 text-primary" />
						<p className="text-lg font-semibold text-primary">Suelta los archivos aquí</p>
					</div>
				</div>
			)}

			<FileViewerModal
				files={(card?.files ?? [])
					.filter((a) => a.path && fileUrls[a.id])
					.map((a) => ({
						id: a.id,
						url: fileUrls[a.id],
						name: a.path as string,
						displayName: a.displayName || getFileName(a.path),
						uploadedAt: a.uploaded_at,
					}))}
				selectedIndex={selectedFileIndex}
				onSelectedIndexChange={setSelectedFileIndex}
			/>
		</>
	);
}
