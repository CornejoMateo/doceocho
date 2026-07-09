'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { Loader2, Upload, FileText, Trash2 } from 'lucide-react';
import { BalanceTransaction } from '@/lib/balances/balance_transactions';
import { FileViewerItem, getFileKind, formatFileSize } from '@/utils/file-upload-utils';
import { useState } from 'react';

interface TransactionFilesGalleryProps {
	open: boolean;
	transaction: BalanceTransaction | null;
	files: FileViewerItem[];
	isLoadingFiles: boolean;
	isUploadingFiles: boolean;
	onUploadFiles: (files: File[]) => void;
	onDeleteFile: (fileId: number) => void;
	onClose: () => void;
	formatCreatedAt: (date: string | null | undefined) => string;
}

export function TransactionFilesGallery({
	open,
	transaction,
	files,
	isLoadingFiles,
	isUploadingFiles,
	onUploadFiles,
	onDeleteFile,
	onClose,
	formatCreatedAt,
}: TransactionFilesGalleryProps) {
	const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
	const [fileToDelete, setFileToDelete] = useState<number | null>(null);

	const handleTriggerUpload = () => {
		document.getElementById('gallery-file-upload')?.click();
	};

	return (
		<>
			<Dialog
				open={open}
				onOpenChange={(open) => {
					if (!open) onClose();
				}}
			>
				<DialogContent className="!max-w-3xl !max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Archivos de la transacción</DialogTitle>
						<DialogDescription>
							Archivos adjuntos a la transacción del{' '}
							{transaction ? formatCreatedAt(transaction.date) : ''}.
						</DialogDescription>
					</DialogHeader>

					<div className="flex justify-end">
						<input
							type="file"
							id="gallery-file-upload"
							className="hidden"
							multiple
							onChange={(e) => {
								const selectedFiles = e.target.files;
								if (selectedFiles && selectedFiles.length > 0) {
									onUploadFiles(Array.from(selectedFiles));
								}
								e.target.value = '';
							}}
						/>
						<Button
							size="sm"
							variant="outline"
							disabled={isUploadingFiles}
							onClick={handleTriggerUpload}
						>
							{isUploadingFiles ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<Upload className="h-4 w-4 mr-2" />
							)}
							{isUploadingFiles ? 'Subiendo...' : 'Subir archivos'}
						</Button>
					</div>

					{isLoadingFiles ? (
						<div className="flex items-center justify-center h-32">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : files.length === 0 ? (
						<div className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg">
							<p className="text-sm text-muted-foreground">No hay archivos adjuntos</p>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
							{files.map((file, index) => {
								const fileKind = getFileKind(file.name);

								return (
									<div
										key={file.id}
										className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
										onClick={() => setSelectedFileIndex(index)}
									>
										{fileKind === 'image' ? (
											<img
												src={file.url}
												alt={file.displayName || file.name}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/60">
												<FileText className="h-12 w-12 text-muted-foreground" />
											</div>
										)}
										<div className="absolute top-2 right-2 opacity-80">
											<Button
												size="icon"
												variant="destructive"
												className="h-7 w-7"
												onClick={(e) => {
													e.stopPropagation();
													setFileToDelete(file.id);
												}}
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</div>
										<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
											<p className="text-white text-xs truncate">{file.displayName || file.name}</p>
											{file.size && (
												<p className="text-white/80 text-xs">{formatFileSize(file.size)}</p>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</DialogContent>
			</Dialog>

			<FileViewerModal
				files={files}
				selectedIndex={selectedFileIndex}
				onSelectedIndexChange={setSelectedFileIndex}
			/>

			<AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. El archivo será eliminado permanentemente.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (fileToDelete != null) {
									onDeleteFile(fileToDelete);
								}
								setFileToDelete(null);
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
