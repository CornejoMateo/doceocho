'use client';

import { useState } from 'react';
import { ImageIcon, FileVideo, FileText, Trash2, Loader2 } from 'lucide-react';
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
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { useChecklistItemGallery } from '@/hooks/checklists/use-checklist-item-gallery';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { getFileExtension, isImage, isVideo, type FileViewerItem } from '@/utils/file-upload-utils';

type Props = {
	itemId: number;
};

export function ChecklistItemGallery({ itemId }: Props) {
	const { images, loading, error, deleteImage } = useChecklistItemGallery(itemId);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [imageToDelete, setImageToDelete] = useState<number | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (imageToDelete == null) return;
		setDeleting(true);
		const { success, error } = await deleteImage(imageToDelete);
		setDeleting(false);
		if (success) {
			toast({ title: 'Archivo eliminado', description: 'El archivo se eliminó correctamente.' });
		} else {
			toast({ title: 'Error', description: translateError(error), variant: 'destructive' });
		}
		setImageToDelete(null);
	};

	const resolveMimeType = (name: string): string => {
		const ext = getFileExtension(name).toLowerCase();
		if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image/jpeg';
		if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video/mp4';
		return 'application/octet-stream';
	};

	if (loading) {
		return (
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<Loader2 className="h-3 w-3 animate-spin" />
				Cargando archivos
			</div>
		);
	}

	if (error) {
		return <p className="text-xs text-destructive">{translateError(error)}</p>;
	}

	if (images.length === 0) {
		return <p className="text-xs text-muted-foreground">No hay archivos subidos</p>;
	}

	const viewerFiles: FileViewerItem[] = images.map((img) => ({
		id: img.id,
		url: img.url,
		name: img.name,
		displayName: img.title,
		uploadedAt: img.uploaded_at,
	}));

	return (
		<>
			<div className="flex flex-wrap gap-2 mt-2">
				{images.map((image) => {
					const mimeType = resolveMimeType(image.name);
					const isImageView = isImage(mimeType);
					const isVideoView = isVideo(mimeType);

					return (
						<div key={image.id} className="relative group">
							<button
								type="button"
								onClick={() => {
									const idx = images.findIndex((i) => i.id === image.id);
									setSelectedIndex(idx);
								}}
								className="w-30 h-30 rounded-md overflow-hidden border bg-muted/20 hover:bg-muted/40 transition-colors"
							>
								{isImageView ? (
									image.url ? (
										<img
											src={image.url}
											alt={image.title || ''}
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center">
											<ImageIcon className="h-5 w-5 text-muted-foreground" />
										</div>
									)
								) : (
									<div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
										{isVideoView ? (
											<FileVideo className="h-6 w-6 text-muted-foreground" />
										) : (
											<FileText className="h-6 w-6 text-muted-foreground" />
										)}
										<span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2">
											{image.name}
										</span>
									</div>
								)}
							</button>
							<button
								type="button"
								aria-label={`Eliminar archivo ${image.name}`}
								onClick={(e) => {
									e.stopPropagation();
									setImageToDelete(image.id);
								}}
								className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity"
							>
								<Trash2 className="h-3 w-3" />
							</button>
						</div>
					);
				})}
			</div>

			{selectedIndex != null && (
				<FileViewerModal
					files={viewerFiles}
					selectedIndex={selectedIndex}
					onSelectedIndexChange={setSelectedIndex}
				/>
			)}

			<AlertDialog open={!!imageToDelete} onOpenChange={() => !deleting && setImageToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
						<AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={deleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Eliminando...
								</>
							) : (
								'Eliminar'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
