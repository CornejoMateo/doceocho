'use client';

import { useEffect, useRef, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Download, Trash2, Paperclip, Eye, AlertCircle } from 'lucide-react';
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
import { ChannelWithLastMessage, ChannelFile } from '@/lib/chat/chat-types';
import { getChannelFileViewUrl } from '@/lib/chat/channel-files';
import { translateError } from '@/lib/error-translator';
import { isAdminRole } from '@/constants/users/user-role';
import { useChannelFiles } from '@/hooks/chat/use-channel-files';
import { formatFileSize, formatDate, isImage, isVideo } from '@/utils/file-upload-utils';

interface ChannelFilesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	channel: ChannelWithLastMessage | null;
	members: any[];
	currentUserId: string;
	currentUserRole: string;
}

export function ChannelFilesDialog({
	open,
	onOpenChange,
	channel,
	members,
	currentUserId,
	currentUserRole,
}: ChannelFilesDialogProps) {
	const [fileToDelete, setFileToDelete] = useState<ChannelFile | null>(null);
	const [previewFile, setPreviewFile] = useState<ChannelFile | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	// Tracks the latest preview request so a stale response can't overwrite a newer/closed preview.
	const previewRequestRef = useRef(0);

	const isAdmin = isAdminRole(currentUserRole);

	const {
		files,
		loading: filesLoading,
		loadingMore: filesLoadingMore,
		uploading,
		error: filesError,
		hasMore: filesHasMore,
		ensureLoaded: ensureFilesLoaded,
		loadMore: loadMoreFiles,
		upload: uploadFile,
		remove: removeFile,
		downloadFile,
		reset: resetFiles,
	} = useChannelFiles(channel?.id ?? null, currentUserId);

	// Lazy load on open; reset on close/channel change.
	useEffect(() => {
		if (open && channel) {
			ensureFilesLoaded(channel.id);
		} else {
			resetFiles();
		}
	}, [open, channel?.id, ensureFilesLoaded, resetFiles]);

	const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = '';
		if (!file) return;
		await uploadFile(file);
	};

	const closePreview = () => {
		previewRequestRef.current += 1; // invalidate any in-flight preview request
		setPreviewFile(null);
		setPreviewUrl(null);
		setPreviewError(null);
		setPreviewLoading(false);
	};

	const handleOpenPreview = async (file: ChannelFile) => {
		const requestId = ++previewRequestRef.current;
		setPreviewFile(file);
		setPreviewUrl(null);
		setPreviewError(null);
		setPreviewLoading(true);

		const { url, error } = await getChannelFileViewUrl(file.storage_path);

		if (requestId !== previewRequestRef.current) return; // a newer request started or preview was closed

		if (!url) {
			setPreviewError(translateError(error) || 'No se pudo cargar la vista previa.');
			setPreviewLoading(false);
			return;
		}

		setPreviewUrl(url);
		setPreviewLoading(false);
	};

	const memberNameByUserId = new Map(
		members.map((m) => [m.user_id, m.users?.username || m.user_id])
	);
	const canDeleteFile = (file: ChannelFile) => isAdmin || file.uploaded_by === currentUserId;
	const canPreviewFile = (file: ChannelFile) =>
		!!file.mime_type && (isImage(file.mime_type) || isVideo(file.mime_type));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="min-w-0 sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Archivos del canal</DialogTitle>
					<DialogDescription>{channel?.name || 'Canal'}</DialogDescription>
				</DialogHeader>

				<div className="min-w-0 space-y-4 py-4">
					<div className="flex items-center justify-between">
						<Label>Archivos</Label>
						<Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
							<Upload className="h-4 w-4 mr-1" />
							{uploading ? 'Subiendo...' : 'Subir archivo'}
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							className="hidden"
							onChange={handleFileInputChange}
						/>
					</div>

					<div className="h-64 border rounded-md p-2 overflow-y-auto">
						{filesLoading ? (
							<div className="text-center text-sm text-muted-foreground py-4">
								Cargando archivos...
							</div>
						) : filesError && files.length === 0 ? (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertTitle>No se pudieron cargar los archivos</AlertTitle>
								<AlertDescription className="space-y-2">
									<p>{filesError}</p>
									<Button
										variant="outline"
										size="sm"
										onClick={() => channel && ensureFilesLoaded(channel.id)}
									>
										Reintentar
									</Button>
								</AlertDescription>
							</Alert>
						) : files.length === 0 ? (
							<div className="text-center text-sm text-muted-foreground py-4">
								No hay archivos en este canal
							</div>
						) : (
							<div className="space-y-2">
								{files.map((file) => (
									<div
										key={file.id}
										className="flex items-center justify-between p-2 bg-muted rounded gap-2"
									>
										<div className="flex items-center gap-2 min-w-0">
											<Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
											<div className="min-w-0">
												<div className="font-medium truncate" title={file.file_name}>
													{file.file_name}
												</div>
												<div className="text-xs text-muted-foreground">
													{formatFileSize(file.size_bytes)} ·{' '}
													{memberNameByUserId.get(file.uploaded_by) || 'Usuario'} ·{' '}
													{formatDate(file.created_at)}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-1 shrink-0">
											{canPreviewFile(file) && (
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleOpenPreview(file)}
													aria-label={`Ver ${file.file_name}`}
												>
													<Eye className="h-4 w-4" />
												</Button>
											)}
											<Button
												variant="ghost"
												size="icon"
												onClick={() => downloadFile(file)}
												aria-label={`Descargar ${file.file_name}`}
											>
												<Download className="h-4 w-4" />
											</Button>
											{canDeleteFile(file) && (
												<Button
													variant="ghost"
													size="icon"
													onClick={() => setFileToDelete(file)}
													aria-label={`Eliminar ${file.file_name}`}
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{filesError && files.length > 0 && (
						// "Cargar más" below re-triggers loadMore and acts as the retry action here.
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>No se pudieron cargar los archivos</AlertTitle>
							<AlertDescription>{filesError}</AlertDescription>
						</Alert>
					)}

					{filesHasMore && (
						<Button
							variant="outline"
							size="sm"
							className="w-full"
							onClick={loadMoreFiles}
							disabled={filesLoadingMore}
						>
							{filesLoadingMore ? 'Cargando...' : 'Cargar más'}
						</Button>
					)}
				</div>

				{/* Nested as DialogContent descendants per the dialog-nesting convention */}
				<AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Eliminar archivo</AlertDialogTitle>
							<AlertDialogDescription>
								¿Estás seguro de que querés eliminar <strong>{fileToDelete?.file_name}</strong>?
								Esta acción no se puede deshacer.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancelar</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									if (fileToDelete) {
										removeFile(fileToDelete);
										setFileToDelete(null);
									}
								}}
							>
								Eliminar
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
					<DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
						<DialogHeader>
							<DialogTitle className="truncate">{previewFile?.file_name}</DialogTitle>
							<DialogDescription className="sr-only">Vista previa del archivo</DialogDescription>
						</DialogHeader>
						<div className="flex-1 min-h-[200px] flex items-center justify-center overflow-auto">
							{previewLoading ? (
								<p className="text-sm text-muted-foreground">Cargando vista previa...</p>
							) : previewError ? (
								<p className="text-sm text-destructive">{previewError}</p>
							) : previewUrl && previewFile && isVideo(previewFile.mime_type || '') ? (
								<video
									src={previewUrl}
									controls
									className="max-w-full max-h-[70vh] object-contain"
								/>
							) : previewUrl && previewFile ? (
								<img
									src={previewUrl}
									alt={previewFile.file_name}
									className="max-w-full max-h-[70vh] object-contain"
								/>
							) : null}
						</div>
					</DialogContent>
				</Dialog>
			</DialogContent>
		</Dialog>
	);
}
