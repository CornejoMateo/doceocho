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
import { ModuleStatusBadge } from '@/helpers/modules/modules-helper';
import { getModuleWorkLabel } from '@/helpers/modules/modules-helper';
import { Module } from '@/lib/modules/modules';
import { ModuleFile, listModuleFiles } from '@/lib/modules/modules-files';
import { getSupabaseClient } from '@/lib/supabase-client';
import {
	formatDate,
	getFileExtension,
	isImage,
	isVideo,
	FileViewerItem,
} from '@/utils/file-upload-utils';
import { Pencil, Trash2, Loader2 } from 'lucide-react';

interface ModuleDetailsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	module: Module | null;
	onEdit: (module: Module) => void;
	onDelete: (module: Module) => void;
}

type ModuleFileWithUrl = ModuleFile & {
	url: string;
	isImg: boolean;
	isVid: boolean;
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

	useEffect(() => {
		if (!open || !module) return;

		let cancelled = false;
		setIsLoading(true);

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
						const ext = getFileExtension(file.file_name || file.storage_path);
						return {
							...file,
							url: blob ? URL.createObjectURL(blob) : '',
							isImg: isImage(contentType) || isImage(ext),
							isVid: isVideo(contentType) || isVideo(ext),
						} as ModuleFileWithUrl;
					} catch (err) {
						setError('Error al descargar el archivo: ' + (err as Error).message);
						return {
							...file,
							url: '',
							isImg: false,
							isVid: false,
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
	}, [open, module]);

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
	}));

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

							{isLoading ? (
								<div className="flex items-center justify-center py-6">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
							) : files.length === 0 ? (
								<p className="text-sm text-muted-foreground py-4">Este módulo no tiene archivos.</p>
							) : (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
									{files.map((file, index) => (
										<button
											key={file.id}
											type="button"
											onClick={() => file.url && setSelectedIndex(index)}
											className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 ring-primary transition-all text-left"
										>
											{file.url && file.isImg ? (
												<img
													src={file.url}
													alt={file.file_name || 'Archivo'}
													className="w-full h-full object-cover"
												/>
											) : file.url && file.isVid ? (
												<div className="w-full h-full flex items-center justify-center bg-black relative">
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
											) : (
												<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs px-2 text-center">
													{file.file_name || 'Archivo'}
												</div>
											)}

											<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
												<p className="text-white text-xs truncate font-medium">
													{file.file_name || 'Archivo'}
												</p>
												{file.description && (
													<p className="text-white/80 text-[10px] truncate">{file.description}</p>
												)}
											</div>
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
						<Button
							type="button"
							variant="outline"
							className="w-full sm:w-auto"
							onClick={() => onEdit(module)}
						>
							<Pencil className="h-4 w-4 mr-2" />
							Editar
						</Button>
						<Button
							type="button"
							variant="destructive"
							className="w-full sm:w-auto"
							onClick={() => onDelete(module)}
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Eliminar
						</Button>
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
