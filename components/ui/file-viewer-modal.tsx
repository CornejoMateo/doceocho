import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Download, FileText, X } from 'lucide-react';
import {
	formatDate,
	formatFileSize,
	getFileExtension,
	isImage,
	isVideo,
} from '@/utils/file-upload-utils';
import { FileViewerItem } from '@/utils/file-upload-utils';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { useEffect } from 'react';

interface FileViewerModalProps {
	files: FileViewerItem[];
	selectedIndex: number | null;
	onSelectedIndexChange: (index: number | null) => void;
}

function resolveMimeType(file: FileViewerItem): string {
	if (file.mimetype && file.mimetype.trim()) {
		return file.mimetype;
	}

	const extension = getFileExtension(file.name).toLowerCase();
	if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(extension)) {
		return 'image/jpeg';
	}

	if (['mp4', 'webm', 'ogg', 'mov'].includes(extension)) {
		return 'video/mp4';
	}

	return 'application/octet-stream';
}

export function FileViewerModal({
	files,
	selectedIndex,
	onSelectedIndexChange,
}: FileViewerModalProps) {
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'ArrowLeft' && selectedIndex !== null && selectedIndex > 0) {
				onSelectedIndexChange(selectedIndex - 1);
			}
			if (e.key === 'ArrowRight' && selectedIndex !== null && selectedIndex < files.length - 1) {
				onSelectedIndexChange(selectedIndex + 1);
			}
			if (e.key === 'Escape') {
				onSelectedIndexChange(null);
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [files, selectedIndex, onSelectedIndexChange]);

	if (selectedIndex === null || !files[selectedIndex]) {
		return null;
	}

	const currentFile = files[selectedIndex];
	const currentMimeType = resolveMimeType(currentFile);
	const canPreviewImage = isImage(currentMimeType);
	const canPreviewVideo = isVideo(currentMimeType);

	const handlePrevious = () => {
		if (selectedIndex > 0) {
			onSelectedIndexChange(selectedIndex - 1);
		}
	};

	const handleNext = () => {
		if (selectedIndex < files.length - 1) {
			onSelectedIndexChange(selectedIndex + 1);
		}
	};

	return (
		<Dialog open onOpenChange={() => onSelectedIndexChange(null)}>
			<DialogContent className="w-screen h-[92dvh] max-w-none p-1 border-0 bg-black/90 flex items-center justify-center overflow-y-auto">
				<VisuallyHidden.Root asChild>
					<DialogTitle>Visor de archivos</DialogTitle>
				</VisuallyHidden.Root>
				<DialogDescription className="sr-only">
					Visualiza el archivo seleccionado. Usa las flechas izquierda y derecha para navegar entre
					los archivos, o el botón de descarga para abrirlo en una nueva pestaña.
				</DialogDescription>
				<Button
					size="icon"
					variant="ghost"
					className="fixed top-4 right-4 z-50 text-white hover:bg-white/20"
					onClick={() => onSelectedIndexChange(null)}
				>
					<X className="h-6 w-6" />
				</Button>
				{selectedIndex > 0 && (
					<Button
						size="icon"
						variant="ghost"
						className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
						onClick={handlePrevious}
					>
						<ChevronLeft className="h-8 w-8" />
					</Button>
				)}
				{selectedIndex < files.length - 1 && (
					<Button
						size="icon"
						variant="ghost"
						className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
						onClick={handleNext}
					>
						<ChevronRight className="h-8 w-8" />
					</Button>
				)}
				<div className="max-w-[80vw] max-h-[80vh] flex flex-col items-center">
					{canPreviewVideo ? (
						<video
							src={currentFile.url}
							controls
							className="max-w-full max-h-full object-contain"
							autoPlay
						/>
					) : canPreviewImage ? (
						<img
							src={currentFile.url}
							alt={currentFile.displayName || currentFile.name}
							className="max-w-full max-h-full object-contain"
						/>
					) : (
						<div className="flex flex-col items-center justify-center p-8 bg-card rounded-lg border">
							<FileText className="h-24 w-24 text-primary mb-4" />
							<p className="text-lg font-semibold text-foreground mb-2">
								{getFileExtension(currentFile.name)}
							</p>
							<p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
								Este tipo de archivo no se puede previsualizar. Usa el botón de descarga para
								abrirlo.
							</p>
							<a
								href={currentFile.url}
								download={currentFile.displayName || currentFile.name}
								className="inline-flex items-center gap-2"
							>
								<Button>
									<Download className="h-4 w-4 mr-2" />
									Descargar archivo
								</Button>
							</a>
						</div>
					)}

					<div className="mt-4 text-white text-center px-4 max-w-xl">
						<p className="font-medium text-lg">{currentFile.displayName || currentFile.name}</p>
						{currentFile.description && (
							<p className="text-sm text-white/80 mt-2">{currentFile.description}</p>
						)}
						<p className="text-sm text-white/70 mt-2">
							{currentFile.size ? formatFileSize(currentFile.size) : ''}
							{currentFile.size && currentFile.uploadedAt ? ' • ' : ''}
							{currentFile.uploadedAt ? formatDate(currentFile.uploadedAt) : ''}
						</p>
						<p className="text-xs mb-5 text-white/50 mt-1">
							{selectedIndex + 1} de {files.length}
						</p>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
