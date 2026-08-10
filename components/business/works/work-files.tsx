'use client';

import { useState, useEffect, useRef } from 'react';
import {
	Work,
	WorkFileItem,
	getFileByWorkId,
	uploadWorkFile,
	deleteWorkFile,
} from '@/lib/works/works';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Upload, Trash2, Loader2, FileText, Camera } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getSupabaseClient } from '@/lib/supabase-client';
import { translateError } from '@/lib/error-translator';
import { useFileUpload } from '@/hooks/use-file-upload';
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
import { UploadFileDialog } from '@/components/ui/upload-file-dialog';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { ImageEditorDialog } from '@/components/ui/image-editor-dialog';
import { formatFileSize, isVideo, isImage, getFileExtension } from '@/utils/file-upload-utils';
import { useAuth } from '@/components/provider/auth-provider';

interface WorkFilesDialogProps {
	work: Work;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type FileWithUrl = WorkFileItem & {
	name: string;
	display_name: string | undefined;
	mimetype: string;
	size: number;
	url: string;
};

export function WorkFilesDialog({ work, open, onOpenChange }: WorkFilesDialogProps) {
	const [files, setFiles] = useState<FileWithUrl[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
	const [fileToDelete, setFileToDelete] = useState<FileWithUrl | null>(null);
	const [isCameraEditorOpen, setIsCameraEditorOpen] = useState(false);
	const [fileForEditor, setFileForEditor] = useState<File | null>(null);

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	const loadRequestRef = useRef(0);
	const objectUrlsRef = useRef<Set<string>>(new Set());

	const revokeObjectUrls = (urls: Set<string>) => {
		urls.forEach((url) => {
			if (url) {
				URL.revokeObjectURL(url);
			}
		});
		urls.clear();
	};

	useEffect(() => {
		if (open) {
			loadFiles();
		}

		// Invalidate in-flight loads and revoke object URLs on close/unmount
		return () => {
			loadRequestRef.current += 1;
			revokeObjectUrls(objectUrlsRef.current);
		};
	}, [open, work.id]);

	const loadFiles = async () => {
		const requestId = ++loadRequestRef.current;
		setIsLoading(true);
		try {
			// Cleanup old URLs
			revokeObjectUrls(objectUrlsRef.current);

			const { data, error } = await getFileByWorkId(work.id);

			if (requestId !== loadRequestRef.current) return;

			if (error) {
				console.error('Error loading files:', error);
				toast({
					variant: 'destructive',
					title: 'Error al cargar archivos',
					description: translateError(error),
				});
				setFiles([]);
				return;
			}

			if (!data || data.length === 0) {
				setFiles([]);
				return;
			}

			// Download files from storage and create object URLs
			const supabase = getSupabaseClient();
			const filesWithUrls = await Promise.all(
				data.map(async (file) => {
					try {
						if (!file.path) {
							return null;
						}

						const { data: blob, error: downloadError } = await supabase.storage
							.from('works-files')
							.download(file.path);

						if (downloadError || !blob) {
							console.error('Error downloading file:', file.path, downloadError);
							return null;
						}

						const name = file.path.split('/').pop() || 'archivo';
						const url = URL.createObjectURL(blob);

						return {
							...file,
							name,
							display_name: file.title || undefined,
							mimetype: blob.type || 'application/octet-stream',
							size: blob.size,
							url,
						};
					} catch (err) {
						console.error('Error processing file:', file.path, err);
						return null;
					}
				})
			);

			const validFiles = filesWithUrls.filter((f): f is FileWithUrl => f !== null);

			if (requestId !== loadRequestRef.current) {
				validFiles.forEach((file) => URL.revokeObjectURL(file.url));
				return;
			}

			validFiles.forEach((file) => objectUrlsRef.current.add(file.url));
			setFiles(validFiles);
		} catch (error) {
			if (requestId !== loadRequestRef.current) return;
			console.error('Unexpected error loading files:', error);
			setFiles([]);
		} finally {
			if (requestId === loadRequestRef.current) {
				setIsLoading(false);
			}
		}
	};

	const {
		isUploadDialogOpen,
		selectedFile,
		displayName,
		description,
		isUploading,
		fileInputRef,
		setDisplayName,
		setDescription,
		handleFileSelect,
		handleUploadSubmit,
		handleCloseUploadDialog,
		openUploadDialogForFile,
		acceptedFileTypes,
	} = useFileUpload({
		uploadFile: async (file, title, desc) => {
			const { error } = await uploadWorkFile(work.id, file, title, desc);
			return { error };
		},
		onUploadSuccess: loadFiles,
		onImageFileSelect: (file) => {
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
			setFileForEditor(file);
			setIsCameraEditorOpen(true);
		},
	});

	const handleImageReady = (imageFile: File) => {
		const shouldContinue = openUploadDialogForFile(imageFile);
		if (shouldContinue) {
			setIsCameraEditorOpen(false);
			setFileForEditor(null);
		}
		return shouldContinue;
	};

	const handleDeleteFile = async () => {
		if (!fileToDelete) return;

		const loadingToast = toast({
			title: 'Eliminando...',
		});

		try {
			const { error } = await deleteWorkFile(fileToDelete.id);

			if (error) {
				loadingToast.update({
					id: loadingToast.id,
					variant: 'destructive',
					title: 'Error al eliminar archivo',
					description: translateError(error),
				});
			} else {
				loadingToast.update({
					id: loadingToast.id,
					title: 'Archivo eliminado',
					description: 'El archivo se eliminó exitosamente.',
				});

				// Close viewer if the deleted file was being viewed
				if (selectedFileIndex !== null && files[selectedFileIndex]?.id === fileToDelete.id) {
					setSelectedFileIndex(null);
				}

				await loadFiles();
			}
		} catch (error) {
			console.error('Error deleting file:', error);
			loadingToast.update({
				id: loadingToast.id,
				variant: 'destructive',
				title: 'Error al eliminar archivo',
				description: translateError(error),
			});
		} finally {
			setFileToDelete(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-3xl max-h-[95dvh] overflow-auto p-4 md:p-6">
				<DialogHeader>
					<DialogTitle className="text-lg md:text-xl">Archivos de la obra</DialogTitle>
					<DialogDescription className="text-sm md:text-xs">
						{work.name || 'Sin nombre'} · Administra las fotos y documentos de esta obra.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
					<h4 className="text-sm font-medium">Archivos ({files.length})</h4>
					<div className="flex items-center gap-2">
						<input
							ref={fileInputRef}
							type="file"
							accept={acceptedFileTypes.join(',')}
							className="hidden"
							onChange={handleFileSelect}
							disabled={isUploading}
						/>
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								setIsCameraEditorOpen(true);
								setFileForEditor(null);
							}}
							disabled={isUploading}
						>
							<Camera className="h-4 w-4 mr-2" />
							Tomar foto
						</Button>
						<Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
							{isUploading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Subiendo...
								</>
							) : (
								<>
									<Upload className="h-4 w-4 mr-2" />
									Subir archivo
								</>
							)}
						</Button>
					</div>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				) : files.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<FileText className="h-12 w-12 text-muted-foreground mb-3" />
						<p className="text-sm text-muted-foreground">No hay archivos para esta obra</p>
					</div>
				) : (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{files.map((file, index) => (
							<div
								key={file.id}
								className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 ring-primary transition-all"
								onClick={() => setSelectedFileIndex(index)}
							>
								{isVideo(file.mimetype) ? (
									<div className="w-full h-full flex items-center justify-center bg-black">
										<video
											src={file.url}
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
								) : isImage(file.mimetype) ? (
									<img src={file.url} alt={file.name} className="w-full h-full object-cover" />
								) : (
									<div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
										<FileText className="h-16 w-16 text-primary mb-2" />
										<p className="text-xs font-medium text-center text-foreground">
											{getFileExtension(file.name)}
										</p>
									</div>
								)}

								{isAuthorized && (
									<div className="absolute top-2 right-2">
										<Button
											size="icon"
											variant="destructive"
											className="h-7 w-7"
											onClick={(e) => {
												e.stopPropagation();
												setFileToDelete(file);
											}}
										>
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								)}

								<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<p className="text-white text-xs truncate font-medium">
										{file.display_name || file.name}
									</p>
									{file.description && (
										<p className="text-white/80 text-xs truncate">{file.description}</p>
									)}
									<p className="text-white/70 text-xs">{formatFileSize(file.size)}</p>
								</div>
							</div>
						))}
					</div>
				)}

				<FileViewerModal
					files={files.map((file) => ({
						id: file.id,
						url: file.url,
						name: file.name,
						displayName: file.display_name,
						description: file.description,
						mimetype: file.mimetype,
						size: file.size,
						uploadedAt: file.uploaded_at,
					}))}
					selectedIndex={selectedFileIndex}
					onSelectedIndexChange={setSelectedFileIndex}
				/>

				<AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
							<AlertDialogDescription>
								Esta acción no se puede deshacer. El archivo &quot;
								{fileToDelete?.display_name || fileToDelete?.name}&quot; será eliminado
								permanentemente.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancelar</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDeleteFile}
								className="bg-destructive hover:bg-destructive/90"
							>
								Eliminar
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<UploadFileDialog
					open={isUploadDialogOpen}
					onOpenChange={(open) => !open && handleCloseUploadDialog()}
					displayName={displayName}
					description={description}
					selectedFile={selectedFile}
					isUploading={isUploading}
					onDisplayNameChange={setDisplayName}
					onDescriptionChange={setDescription}
					onSubmit={handleUploadSubmit}
					title="Subir archivo"
					descriptionText="Completa la información del archivo que deseas subir."
					submitText="Subir archivo"
				/>

				<ImageEditorDialog
					open={isCameraEditorOpen}
					onOpenChange={(open) => {
						setIsCameraEditorOpen(open);
						if (!open) setFileForEditor(null);
					}}
					onImageReady={handleImageReady}
					initialFile={fileForEditor}
				/>
			</DialogContent>
		</Dialog>
	);
}
