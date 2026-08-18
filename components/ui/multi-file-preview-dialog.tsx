'use client';

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X, Pencil, Loader2, Check } from 'lucide-react';
import { isImage, formatFileSize } from '@/utils/file-upload-utils';
import { ImageEditorDialog } from '@/components/ui/image-editor-dialog';

interface FileWithPreview {
	file: File;
	preview: string;
	id: string;
	editedFile?: File;
	displayName: string;
	description: string;
}

interface MultiFilePreviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	files: File[];
	onUpload: (
		files: Array<{ file: File; displayName: string; description: string }>
	) => Promise<void>;
	isUploading: boolean;
}

export function MultiFilePreviewDialog({
	open,
	onOpenChange,
	files,
	onUpload,
	isUploading,
}: MultiFilePreviewDialogProps) {
	const [filesWithPreview, setFilesWithPreview] = useState<FileWithPreview[]>([]);
	const [editingFileId, setEditingFileId] = useState<string | null>(null);
	const [selectedFileForEdit, setSelectedFileForEdit] = useState<File | null>(null);

	useEffect(() => {
		if (open && files.length > 0) {
			const previews = files.map((file) => ({
				file,
				id: `${file.name}-${file.size}-${Date.now()}`,
				preview: isImage(file.type) ? URL.createObjectURL(file) : '',
				displayName: file.name.replace(/\.[^/.]+$/, ''),
				description: '',
			}));
			setFilesWithPreview(previews);
		} else if (!open) {
			// Cleanup URLs when dialog closes
			filesWithPreview.forEach((f) => {
				if (f.preview) {
					URL.revokeObjectURL(f.preview);
				}
			});
			setFilesWithPreview([]);
		}
	}, [open, files]);

	const handleRemoveFile = (id: string) => {
		setFilesWithPreview((prev) => {
			const fileToRemove = prev.find((f) => f.id === id);
			if (fileToRemove?.preview) {
				URL.revokeObjectURL(fileToRemove.preview);
			}
			return prev.filter((f) => f.id !== id);
		});
	};

	const handleEditImage = (fileWithPreview: FileWithPreview) => {
		const fileToEdit = fileWithPreview.editedFile || fileWithPreview.file;
		setSelectedFileForEdit(fileToEdit);
		setEditingFileId(fileWithPreview.id);
	};

	const handleImageEdited = (editedFile: File) => {
		if (editingFileId) {
			setFilesWithPreview((prev) =>
				prev.map((f) =>
					f.id === editingFileId
						? {
								...f,
								editedFile,
								preview: URL.createObjectURL(editedFile),
							}
						: f
				)
			);
		}
		setEditingFileId(null);
		setSelectedFileForEdit(null);
		return true;
	};

	const handleDisplayNameChange = (id: string, value: string) => {
		setFilesWithPreview((prev) =>
			prev.map((f) => (f.id === id ? { ...f, displayName: value } : f))
		);
	};

	const handleDescriptionChange = (id: string, value: string) => {
		setFilesWithPreview((prev) =>
			prev.map((f) => (f.id === id ? { ...f, description: value } : f))
		);
	};

	const handleUploadAll = async () => {
		const filesToUpload = filesWithPreview.map((f) => ({
			file: f.editedFile || f.file,
			displayName: f.displayName,
			description: f.description,
		}));
		await onUpload(filesToUpload);
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="w-[95vw] max-w-4xl max-h-[90dvh] overflow-auto p-4 md:p-6">
					<DialogHeader>
						<DialogTitle className="text-lg md:text-xl">
							Vista previa de archivos ({filesWithPreview.length})
						</DialogTitle>
						<DialogDescription className="text-sm md:text-base">
							Revisa y edita las imágenes antes de subirlas. Puedes editar individualmente cada
							imagen o subirlas todas juntas.
						</DialogDescription>
					</DialogHeader>

					{filesWithPreview.length === 0 ? (
						<div className="flex items-center justify-center py-8">
							<p className="text-muted-foreground">No hay archivos para subir</p>
						</div>
					) : (
						<div className="space-y-4">
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
								{filesWithPreview.map((fileWithPreview) => (
									<div
										key={fileWithPreview.id}
										className="border rounded-lg p-3 space-y-2 relative group"
									>
										<Button
											size="icon"
											variant="destructive"
											className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
											onClick={() => handleRemoveFile(fileWithPreview.id)}
										>
											<X className="h-3 w-3" />
										</Button>

										{isImage(fileWithPreview.file.type) ? (
											<div className="relative aspect-square rounded-md overflow-hidden bg-muted">
												<img
													src={fileWithPreview.preview}
													alt={fileWithPreview.file.name}
													className="w-full h-full object-cover"
												/>
												{fileWithPreview.editedFile && (
													<div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 z-10">
														<Check className="h-3 w-3" />
														Editada
													</div>
												)}
											</div>
										) : (
											<div className="aspect-square rounded-md bg-muted flex items-center justify-center">
												<p className="text-sm text-muted-foreground text-center p-2">
													{fileWithPreview.file.name}
												</p>
											</div>
										)}

										<div className="space-y-1">
											<input
												type="text"
												value={fileWithPreview.displayName}
												onChange={(e) =>
													handleDisplayNameChange(fileWithPreview.id, e.target.value)
												}
												className="w-full px-2 py-1 text-sm border rounded"
												placeholder="Nombre del archivo"
											/>
											<textarea
												value={fileWithPreview.description}
												onChange={(e) =>
													handleDescriptionChange(fileWithPreview.id, e.target.value)
												}
												className="w-full px-2 py-1 text-sm border rounded resize-none"
												placeholder="Descripción (opcional)"
												rows={2}
											/>
											<p className="text-xs text-muted-foreground">
												{formatFileSize(fileWithPreview.file.size)}
											</p>
										</div>

										{isImage(fileWithPreview.file.type) && (
											<Button
												size="sm"
												variant="outline"
												className="w-full text-xs h-8"
												onClick={() => handleEditImage(fileWithPreview)}
											>
												<Pencil className="h-3 w-3 mr-1" />
												Editar
											</Button>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					<DialogFooter className="flex-col sm:flex-row gap-2">
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isUploading}
							className="w-full sm:w-auto"
						>
							<X className="h-4 w-4 mr-2" />
							Cancelar
						</Button>
						<Button
							onClick={handleUploadAll}
							disabled={isUploading || filesWithPreview.length === 0}
							className="w-full sm:w-auto"
						>
							{isUploading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Subiendo...
								</>
							) : (
								<>
									<Upload className="h-4 w-4 mr-2" />
									Subir todos ({filesWithPreview.length})
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ImageEditorDialog
				open={editingFileId !== null}
				onOpenChange={(open) => {
					if (!open) {
						setEditingFileId(null);
						setSelectedFileForEdit(null);
					}
				}}
				onImageReady={handleImageEdited}
				initialFile={selectedFileForEdit}
			/>
		</>
	);
}
