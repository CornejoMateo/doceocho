'use client';

import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileViewerModal } from '@/components/ui/file-viewer-modal';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { ModuleStatusBadge } from '@/helpers/modules/modules-helper';
import { getModuleWorkLabel } from '@/helpers/modules/modules-helper';
import { Module } from '@/lib/modules/modules';
import { ModuleFile, listModuleFiles } from '@/lib/modules/modules-files';
import { getSupabaseClient } from '@/lib/supabase-client';
import { translateError } from '@/lib/error-translator';
import {
	formatDate,
	getFileKind,
	isImage,
	isVideo,
	FileViewerItem,
} from '@/utils/file-upload-utils';
import {
	AlertCircle,
	Download,
	Loader2,
	Pencil,
	RotateCcw,
	Trash2,
	Video,
	FileText,
} from 'lucide-react';

interface ModuleDetailsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	module: Module | null;
	onEdit?: (module: Module) => void;
	onDelete?: (module: Module) => void;
}

type ModuleFileWithUrl = ModuleFile & {
	url: string;
	isImg: boolean;
	isVid: boolean;
	fileType: string;
	size?: number;
};

export function ModuleDetailsModal({
	open,
	onOpenChange,
	module,
	onEdit,
	onDelete,
}: ModuleDetailsModalProps) {
	const [files, setFiles] = useState<ModuleFileWithUrl[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const [error, setError] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		if (!open || !module) return;

		let cancelled = false;
		setIsLoading(true);
		setError(null);

		const loadFiles = async () => {
			const { data, error } = await listModuleFiles(module.id);

			if (cancelled) return;
			if (error) {
				console.error('Error cargando archivos del módulo:', error);
				setFiles([]);
				setIsLoading(false);
				return;
			}

			const supabase = getSupabaseClient();
			const withUrls = await Promise.all(
				(data ?? []).map(async (file) => {
					try {
						const { data: blob } = await supabase.storage
							.from('modules')
							.download(file.storage_path);
						const contentType = blob?.type || '';
						const sourceName = file.file_name || file.storage_path;
						const kind = getFileKind(sourceName);
						const fileType =
							contentType ||
							(kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : '');
						return {
							...file,
							url: blob ? URL.createObjectURL(blob) : '',
							isImg: isImage(contentType) || kind === 'image',
							isVid: isVideo(contentType) || kind === 'video',
							fileType,
							size: blob?.size,
						} as ModuleFileWithUrl;
					} catch (err) {
						setError('Error al descargar el archivo: ' + (err as Error).message);
						return {
							...file,
							url: '',
							isImg: false,
							isVid: false,
							fileType: '',
						} as ModuleFileWithUrl;
					}
				})
			);

			if (!cancelled) {
				setFiles(withUrls);
				setIsLoading(false);
			}
		};

		loadFiles();

		return () => {
			cancelled = true;
		};
	}, [open, module, reloadKey]);

	useEffect(() => {
		if (!open) {
			files.forEach((f) => {
				if (f.url) URL.revokeObjectURL(f.url);
			});
			setFiles([]);
			setSelectedIndex(null);
		}
	}, [open]);

	if (!module) return null;

	const viewerFiles: FileViewerItem[] = files.map((f) => ({
		id: f.id,
		url: f.url,
		name: f.file_name || 'Archivo',
		displayName: f.file_name || 'Archivo',
		description: f.description || null,
		mimetype: f.fileType || null,
		size: f.size ?? null,
	}));

	const handleDownload = async (file: ModuleFileWithUrl) => {
		try {
			const { data: blob } = await getSupabaseClient()
				.storage.from('modules')
				.download(file.storage_path);
			if (!blob) {
				toast({
					variant: 'destructive',
					title: 'No se pudo descargar',
					description: 'El archivo no está disponible en el servidor.',
				});
				return;
			}
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = file.file_name || 'archivo';
			link.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			toast({
				variant: 'destructive',
				title: 'No se pudo descargar',
				description: translateError(err) || 'Ocurrió un error al descargar el archivo.',
			});
		}
	};

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="min-w-0 w-[95vw] sm:max-w-3xl max-h-[92dvh] overflow-y-auto p-4 md:p-6">
					<DialogHeader className="text-left">
						<DialogTitle className="text-lg md:text-xl">{module.title || 'Módulo'}</DialogTitle>
						<DialogDescription className="text-sm">
							Detalles del módulo y sus archivos.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 min-w-0">
						<div className="flex items-center justify-between gap-2 flex-wrap">
							<ModuleStatusBadge status={module.status} />
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							{module.created_at && (
								<span className="text-sm text-muted-foreground">
									{formatDate(module.created_at)}
								</span>
							)}
						</div>

						<div className="space-y-2 text-sm">
							<p>
								<span className="font-medium text-foreground">Obra: </span>
								<span className="text-muted-foreground">{getModuleWorkLabel(module)}</span>
							</p>
							{module.description && (
								<p>
									<span className="font-medium text-foreground">Descripción: </span>
									<span className="text-muted-foreground whitespace-pre-wrap">
										{module.description}
									</span>
								</p>
							)}
						</div>

						<div className="grid gap-2">
							<h4 className="text-sm font-medium text-foreground">Archivos ({files.length})</h4>

							{error && (
								<Alert variant="destructive" className="flex-1 min-w-0">
									<AlertCircle className="h-4 w-4" />
									<div className="flex items-start justify-between gap-2 min-w-0 flex-1">
										<div className="min-w-0">
											<AlertTitle>Error cargando algunos archivos</AlertTitle>
											<AlertDescription className="whitespace-pre-wrap break-words">
												{error}
											</AlertDescription>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="shrink-0"
											onClick={() => setReloadKey((k) => k + 1)}
										>
											<RotateCcw className="h-3.5 w-3.5 mr-1" />
											Reintentar
										</Button>
									</div>
								</Alert>
							)}

							{isLoading ? (
								<div className="flex items-center justify-center py-6">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
							) : files.length === 0 ? (
								<p className="text-sm text-muted-foreground py-4">Este módulo no tiene archivos.</p>
							) : (
								<div className="flex flex-col gap-2">
									{files.map((file, index) => {
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
															<video
																src={file.url}
																className="w-full h-full object-cover"
																muted
																playsInline
															/>
														</span>
													) : (
														<span className="w-full h-full flex items-center justify-center text-muted-foreground">
															{file.isVid ? (
																<Video className="h-5 w-5" />
															) : (
																<FileText className="h-5 w-5" />
															)}
														</span>
													)}
												</span>
												<span className="flex flex-col min-w-0 flex-1 gap-0.5">
													<span className="text-sm font-medium truncate">
														{file.file_name || 'Archivo'}
													</span>
													{file.description ? (
														<span className="text-xs text-muted-foreground whitespace-pre-wrap">
															{file.description}
														</span>
													) : (
														<span className="text-xs text-muted-foreground/60 italic">
															Sin descripción
														</span>
													)}
												</span>
											</>
										);

										return (
											<div
												key={file.id}
												className="group flex items-center gap-3 rounded-lg border bg-muted/40 p-2 hover:ring-2 ring-primary transition-all"
											>
												{file.url ? (
													<button
														type="button"
														onClick={() => setSelectedIndex(index)}
														className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
													>
														{content}
													</button>
												) : (
													<div className="flex items-center gap-3 min-w-0 flex-1 text-left">
														{content}
													</div>
												)}
												{!file.url && (
													<Button
														type="button"
														variant="outline"
														size="icon"
														className="shrink-0"
														title="Descargar archivo"
														onClick={() => handleDownload(file)}
													>
														<Download className="h-4 w-4" />
													</Button>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
						{onEdit && (
							<Button
								type="button"
								variant="outline"
								className="w-full sm:w-auto"
								onClick={() => onEdit(module)}
							>
								<Pencil className="h-4 w-4 mr-2" />
								Editar
							</Button>
						)}
						{onDelete && (
							<Button
								type="button"
								variant="destructive"
								className="w-full sm:w-auto"
								onClick={() => onDelete(module)}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Eliminar
							</Button>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<FileViewerModal
				files={viewerFiles}
				selectedIndex={selectedIndex}
				onSelectedIndexChange={setSelectedIndex}
			/>
		</>
	);
}
