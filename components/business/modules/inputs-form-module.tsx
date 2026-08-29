'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Work } from '@/lib/works/works';
import { formatFileSize } from '@/utils/file-upload-utils';
import {
	Camera,
	Video,
	Square,
	Image as ImageIcon,
	X,
	Pencil,
	Check,
	ChevronsUpDown,
	Trash2,
} from 'lucide-react';

export type PendingFile = {
	id: string;
	file?: File;
	preview: string;
	isImage: boolean;
	displayName: string;
	description: string;
	editedFile?: File;
	existingId?: number;
	size?: number;
};

export type WorkQuery = Work & {
	searchText?: string;
};

interface InputsFormModuleProps {
	title: string;
	description: string;
	works: WorkQuery[];
	work: Work | null;
	workPopoverOpen: boolean;
	files: PendingFile[];
	isRecording: boolean;
	recordingTime: number;
	recordingSize: number;
	videoPreviewRef: React.RefObject<HTMLVideoElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onTitleChange: (value: string) => void;
	onDescriptionChange: (value: string) => void;
	onWorkPopoverOpenChange: (open: boolean) => void;
	onWorkSelect: (work: Work) => void;
	onAddFiles: (files: File[]) => void;
	onRemoveFile: (id: string) => void;
	onUpdateFileField: (id: string, field: 'displayName' | 'description', value: string) => void;
	onRemoveAllFiles: () => void;
	onTakePhoto: () => void;
	onEditFile: (id: string, file: File) => void;
	onToggleRecording: () => void;
	formatTime: (seconds: number) => string;
}

export function InputsFormModule({
	title,
	description,
	works,
	work,
	workPopoverOpen,
	files,
	isRecording,
	recordingTime,
	recordingSize,
	videoPreviewRef,
	fileInputRef,
	onTitleChange,
	onDescriptionChange,
	onWorkPopoverOpenChange,
	onWorkSelect,
	onAddFiles,
	onRemoveFile,
	onUpdateFileField,
	onRemoveAllFiles,
	onTakePhoto,
	onEditFile,
	onToggleRecording,
	formatTime,
}: InputsFormModuleProps) {
	return (
		<div className="space-y-5 min-w-0">
			<div className="grid gap-2">
				<Label htmlFor="module-title" className="text-foreground">
					Título
				</Label>
				<Input
					id="module-title"
					value={title}
					onChange={(e) => onTitleChange(e.target.value)}
					placeholder="Título del módulo"
					className="bg-background"
				/>
			</div>

			<div className="grid gap-2 min-w-0">
				<Label className="text-foreground">Obra</Label>
				<Popover open={workPopoverOpen} onOpenChange={onWorkPopoverOpenChange}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={workPopoverOpen}
							className="min-w-0 w-full justify-between bg-background"
						>
							<span className="truncate min-w-0 w-full">
								{work
									? [work.locality, work.address, work.hood, work.zone]
											.filter(Boolean)
											.join(' - ') || work.name
									: 'Buscar obra por localidad, dirección, barrio o zona...'}
							</span>
							<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[90vw] p-0 max-h-[var(--radix-popover-content-available-height)] overflow-hidden">
						<Command className="w-full">
							<CommandInput placeholder="Buscar obra..." />
							<CommandList className="w-full max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain touch-pan-y">
								<CommandEmpty>No se encontró ninguna obra</CommandEmpty>
								{works.map((w) => (
									<CommandItem
										key={w.id}
										value={w.searchText || ''}
										onSelect={() => onWorkSelect(w)}
									>
										<Check
											className={`mr-2 h-4 w-4 shrink-0 ${work?.id === w.id ? 'opacity-100' : 'opacity-0'}`}
										/>
										<div className="flex flex-col min-w-0">
											<span className="truncate">
												{[w.locality, w.address, w.hood, w.zone].filter(Boolean).join(' - ') ||
													w.name ||
													`Obra #${w.id}`}
											</span>
										</div>
									</CommandItem>
								))}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="module-description" className="text-foreground">
					Descripción
				</Label>
				<Textarea
					id="module-description"
					value={description}
					onChange={(e) => onDescriptionChange(e.target.value)}
					placeholder="Descripción del módulo (opcional)"
					className="bg-background min-h-[90px]"
				/>
			</div>

			<div className="grid gap-2 min-w-0">
				<Label className="text-foreground">Archivos del módulo</Label>

				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*,video/*"
						multiple
						className="hidden"
						onChange={(e) => {
							const selected = e.target.files;
							if (selected && selected.length > 0) {
								onAddFiles(Array.from(selected));
							}
							e.target.value = '';
						}}
					/>
					<Button
						type="button"
						variant="outline"
						className="flex-col h-auto py-4 gap-1 text-xs"
						onClick={onTakePhoto}
					>
						<Camera className="h-5 w-5" />
						Tomar foto
					</Button>
					<Button
						type="button"
						variant="outline"
						className="flex-col h-auto py-4 gap-1 text-xs"
						onClick={onToggleRecording}
						disabled={isRecording}
					>
						<Video className="h-5 w-5" />
						Grabar video
					</Button>
					<Button
						type="button"
						variant="outline"
						className="flex-col h-auto py-4 gap-1 text-xs"
						onClick={() => fileInputRef.current?.click()}
					>
						<ImageIcon className="h-5 w-5" />
						Cargar archivos
					</Button>
				</div>

				<p className="text-[10px] text-muted-foreground">
					Imágenes hasta 10MB · Videos hasta 50MB (se detiene al llegar al límite)
				</p>

				{isRecording && (
					<div className="relative rounded-lg overflow-hidden bg-black aspect-video">
						<video
							ref={videoPreviewRef}
							autoPlay
							playsInline
							muted
							className="w-full h-full object-cover"
						/>
						<div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
							</span>
							<span>
								GRABANDO {formatTime(recordingTime)}{' '}
								<span className="text-white/70">· {formatFileSize(recordingSize)}</span>
							</span>
						</div>
						<Button
							type="button"
							variant="destructive"
							className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 gap-1.5"
							onClick={onToggleRecording}
						>
							<Square className="h-4 w-4 fill-current" />
							Detener
						</Button>
					</div>
				)}

				{files.length > 0 && (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
						{files.map((pending) => (
							<div key={pending.id} className="border rounded-lg p-2 space-y-2 relative group">
								<Button
									size="icon"
									variant="destructive"
									type="button"
									className="absolute top-2 right-2 h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
									onClick={() => onRemoveFile(pending.id)}
								>
									<X className="h-3 w-3" />
								</Button>

								{pending.isImage ? (
									<div className="relative aspect-square rounded-md overflow-hidden bg-muted">
										<img
											src={pending.preview}
											alt={pending.displayName}
											className="w-full h-full object-cover"
										/>
										{pending.editedFile && (
											<div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-[10px] flex items-center gap-1 z-10">
												<Check className="h-3 w-3" />
												Editada
											</div>
										)}
									</div>
								) : (
									<div className="aspect-square rounded-md bg-muted flex items-center justify-center text-center p-2">
										<div className="flex flex-col items-center gap-1">
											<Video className="h-6 w-6 text-muted-foreground" />
											<p className="text-[10px] text-muted-foreground truncate w-full">
												{pending.displayName}
											</p>
										</div>
									</div>
								)}

								<div className="space-y-1.5">
									<input
										type="text"
										value={pending.displayName}
										onChange={(e) => onUpdateFileField(pending.id, 'displayName', e.target.value)}
										className="w-full px-2 py-1 text-xs border rounded bg-background"
										placeholder="Título del archivo"
									/>
									<textarea
										value={pending.description}
										onChange={(e) => onUpdateFileField(pending.id, 'description', e.target.value)}
										className="w-full px-2 py-1 text-xs border rounded bg-background resize-none"
										placeholder="Descripción (opcional)"
										rows={2}
									/>
									<p className="text-[10px] text-muted-foreground">
										{pending.size != null
											? formatFileSize(pending.size)
											: pending.file
												? formatFileSize(pending.file.size)
												: 'Tamaño desconocido'}
									</p>
								</div>

								{pending.isImage && pending.file && (
									<Button
										size="sm"
										variant="outline"
										type="button"
										className="w-full text-xs h-8"
										onClick={() => {
											const current = pending.file;
											if (current) onEditFile(pending.id, current);
										}}
									>
										<Pencil className="h-3 w-3 mr-1" />
										Editar
									</Button>
								)}
							</div>
						))}
					</div>
				)}

				{files.length > 0 && (
					<div className="flex items-center justify-end">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-destructive"
							onClick={onRemoveAllFiles}
						>
							<Trash2 className="h-4 w-4 mr-1" />
							Quitar todos
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
