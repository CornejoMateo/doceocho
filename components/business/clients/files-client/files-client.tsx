'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/lib/clients/clients';
import { deleteClientFile, ClientFileRecord, listClientFiles } from '@/lib/clients/files';
import { Button } from '@/components/ui/button';
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

interface ClientFilesProps {
	client: Client;
}

type FileWithUrl = ClientFileRecord & {
	name: string;
	display_name: string | undefined;
	mimetype: string;
	size: number;
	url: string;
};

export function ClientImagesGallery({ client }: ClientFilesProps) {
	const [files, setFiles] = useState<FileWithUrl[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
	const [fileToDelete, setFileToDelete] = useState<FileWithUrl | null>(null);
	const [isCameraEditorOpen, setIsCameraEditorOpen] = useState(false);

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	useEffect(() => {
		loadFiles();

		// Cleanup object URLs on unmount
		return () => {
			files.forEach((file) => {
				if (file.url) {
					URL.revokeObjectURL(file.url);
				}
			});
		};
	}, [client.id]);

	const loadFiles = async () => {
		setIsLoading(true);
		try {
			// Cleanup old URLs
			files.forEach((file) => {
				if (file.url) {
					URL.revokeObjectURL(file.url);
				}
			});

			const { data, error } = await listClientFiles(client.id);

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
							.from('clients')
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
			setFiles(validFiles);
		} catch (error) {
			console.error('Unexpected error loading files:', error);
			setFiles([]);
		} finally {
			setIsLoading(false);
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
		clientId: client.id,
		onUploadSuccess: loadFiles,
	});

	const handleImageReady = (imageFile: File) => {
		openUploadDialogForFile(imageFile);
		setIsCameraEditorOpen(false);
	};

	const handleDeleteFile = async () => {
		if (!fileToDelete) return;

		const loadingToast = toast({
			title: 'Eliminando....',
		});

		try {
			const { error } = await deleteClientFile(fileToDelete.id);

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
				if (selectedFileIndex !== null && files[selectedFileIndex]?.name === fileToDelete.name) {
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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between mb-4">
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
						onClick={() => setIsCameraEditorOpen(true)}
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

			{files.length === 0 ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="text-center">
						<p className="text-sm text-muted-foreground mb-4">No hay archivos para este cliente</p>
					</div>
				</div>
			) : (
				<div className="flex-1 overflow-y-auto">
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

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. El archivo "
							{fileToDelete?.display_name || fileToDelete?.name}" será eliminado permanentemente.
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
				onOpenChange={setIsCameraEditorOpen}
				onImageReady={handleImageReady}
			/>
		</div>
	);
}
