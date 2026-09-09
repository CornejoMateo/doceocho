'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UploadFileDialog } from '@/components/ui/upload-file-dialog';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { useFileUpload } from '@/hooks/use-file-upload';
import {
	EmployeeDocumentWithUrl,
	useEmployeeDocuments,
} from '@/hooks/human-resources/use-employee-documents';
import { uploadEmployeeDocument } from '@/lib/human-resources/employee-documents';
import { MAX_EMPLOYEE_DOCUMENT_SIZE } from '@/constants/human-resources/employees';
import {
	CLIENT_FILE_TYPES,
	formatFileSize,
	getFileExtension,
	isImage,
	isVideo,
} from '@/utils/file-upload-utils';

interface EmployeeDocumentsProps {
	employeeId: number;
	/** Only mounted tabs should hit the network. */
	enabled?: boolean;
}

export function EmployeeDocuments({ employeeId, enabled = true }: EmployeeDocumentsProps) {
	const [selectedDocumentIndex, setSelectedDocumentIndex] = useState<number | null>(null);
	const [documentToDelete, setDocumentToDelete] = useState<EmployeeDocumentWithUrl | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const { documents, isLoading, loadDocuments, remove } = useEmployeeDocuments(employeeId, enabled);

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
		acceptedFileTypes,
	} = useFileUpload({
		allowedFileTypes: CLIENT_FILE_TYPES,
		maxFileSize: MAX_EMPLOYEE_DOCUMENT_SIZE,
		uploadFile: async (file, title, fileDescription) => {
			const { error } = await uploadEmployeeDocument(employeeId, file, title, fileDescription);
			return { error };
		},
		onUploadSuccess: loadDocuments,
	});

	const handleDelete = async () => {
		if (!documentToDelete) return;

		setIsDeleting(true);

		try {
			const wasDeleted = await remove(documentToDelete.id);

			// Close the viewer if the document being deleted was open.
			if (
				wasDeleted &&
				selectedDocumentIndex !== null &&
				documents[selectedDocumentIndex]?.id === documentToDelete.id
			) {
				setSelectedDocumentIndex(null);
			}
		} finally {
			setIsDeleting(false);
			setDocumentToDelete(null);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h4 className="text-sm font-medium">Documentos ({documents.length})</h4>
				<div className="flex items-center gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept={acceptedFileTypes.join(',')}
						className="hidden"
						onChange={handleFileSelect}
						disabled={isUploading}
					/>
					<Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
						{isUploading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Subiendo...
							</>
						) : (
							<>
								<Upload className="h-4 w-4 mr-2" />
								Subir documento
							</>
						)}
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-16">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : documents.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<FileText className="h-12 w-12 text-muted-foreground mb-3" />
					<p className="text-sm text-muted-foreground">
						Todavía no hay documentos cargados para este empleado.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
					{documents.map((document, index) => (
						<div
							key={document.id}
							className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 ring-primary transition-all"
							onClick={() => setSelectedDocumentIndex(index)}
						>
							{isImage(document.mimetype) ? (
								<img
									src={document.url}
									alt={document.title || document.name}
									className="w-full h-full object-cover"
								/>
							) : isVideo(document.mimetype) ? (
								<video
									src={document.url}
									className="w-full h-full object-cover"
									muted
									playsInline
								/>
							) : (
								<div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
									<FileText className="h-16 w-16 text-primary mb-2" />
									<p className="text-xs font-medium text-center text-foreground">
										{getFileExtension(document.name)}
									</p>
								</div>
							)}

							<div className="absolute top-2 right-2">
								<Button
									size="icon"
									variant="destructive"
									className="h-7 w-7"
									aria-label="Eliminar documento"
									onClick={(event) => {
										event.stopPropagation();
										setDocumentToDelete(document);
									}}
								>
									<Trash2 className="h-3 w-3" />
								</Button>
							</div>

							<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<p className="text-white text-xs truncate font-medium">
									{document.title || document.name}
								</p>
								{document.size ? (
									<p className="text-white/70 text-xs">{formatFileSize(document.size)}</p>
								) : null}
							</div>
						</div>
					))}
				</div>
			)}

			<FileViewerModal
				files={documents.map((document) => ({
					id: document.id,
					url: document.url,
					name: document.name,
					displayName: document.title,
					description: document.description,
					mimetype: document.mimetype,
					size: document.size,
					uploadedAt: document.uploaded_at,
				}))}
				selectedIndex={selectedDocumentIndex}
				onSelectedIndexChange={setSelectedDocumentIndex}
			/>

			<ConfirmDialog
				open={!!documentToDelete}
				onOpenChange={(open) => !open && setDocumentToDelete(null)}
				title="Eliminar documento"
				description={`El documento "${
					documentToDelete?.title || documentToDelete?.name
				}" se eliminará permanentemente. Esta acción no se puede deshacer.`}
				onConfirm={handleDelete}
				isLoading={isDeleting}
			/>

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
				title="Subir documento"
				descriptionText="Completá la información del documento que querés subir."
				submitText="Subir documento"
			/>
		</div>
	);
}
