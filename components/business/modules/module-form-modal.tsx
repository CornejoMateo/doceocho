'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { translateError } from '@/lib/error-translator';
import { createModule, updateModule, Module } from '@/lib/modules/modules';
import { uploadModuleFile, deleteModuleFile, updateModuleFile } from '@/lib/modules/modules-files';
import { listWorks, Work } from '@/lib/works/works';
import { ImageEditorDialog } from '@/components/ui/image-editor-dialog';
import { useAuth } from '@/components/provider/auth-provider';
import { InputsFormModule, WorkQuery } from '@/components/business/modules/inputs-form-module';
import { useModuleFiles } from '@/hooks/modules/use-module-files';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { formatTimeVideo } from '@/utils/format-date';

interface ModuleFormModalProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onCreated?: (module: Module) => void;
	moduleToEdit?: Module | null;
}

const buildWorkSearchText = (work: Work): string => {
	return [work.locality, work.address, work.hood, work.zone, work.name]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
};

export function ModuleFormModal({
	open = false,
	onOpenChange,
	onCreated,
	moduleToEdit,
}: ModuleFormModalProps) {
	const [isOpen, setIsOpen] = useState(open);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [works, setWorks] = useState<WorkQuery[]>([]);
	const [work, setWork] = useState<Work | null>(null);
	const [workPopoverOpen, setWorkPopoverOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		files,
		addFiles,
		removeFile,
		updateFileField,
		removeAllFiles,
		isRecording,
		recordingTime,
		recordingSize,
		stopRecording,
		toggleRecording,
		videoPreviewRef,
		fileInputRef,
		editorOpen,
		fileForEditor,
		openEditorForNew,
		openEditorForEdit,
		closeEditor,
		handleImageReady,
		getOriginalExistingIds,
		errorFiles: errorFiles,
	} = useModuleFiles({ moduleToEdit, enabled: isOpen });

	const { user } = useAuth();

	const isEditing = !!moduleToEdit;

	useEffect(() => {
		setIsOpen(open);
	}, [open]);

	useEffect(() => {
		if (!isOpen) return;
		setError(null);

		let cancelled = false;

		const loadWorks = async () => {
			const { data, error } = await listWorks();
			if (cancelled) return;
			if (error) {
				setError('Error cargando obras: ' + translateError(error));
				return;
			}
			setWorks(
				(data ?? []).map((w) => ({
					...w,
					searchText: buildWorkSearchText(w),
				}))
			);
		};

		if (moduleToEdit) {
			setTitle(moduleToEdit.title || '');
			setDescription(moduleToEdit.description || '');
			setWork(
				moduleToEdit.work_id
					? ({
							id: moduleToEdit.work_id,
							name: moduleToEdit.works?.name || null,
							locality: moduleToEdit.works?.locality || null,
							address: moduleToEdit.works?.address || null,
							hood: moduleToEdit.works?.hood || null,
							zone: moduleToEdit.works?.zone || null,
						} as Work)
					: null
			);
		} else {
			setTitle('');
			setDescription('');
			setWork(null);
		}

		loadWorks();

		return () => {
			cancelled = true;
		};
	}, [isOpen, moduleToEdit]);

	const resetForm = () => {
		setTitle('');
		setDescription('');
		setWork(null);
		removeAllFiles();
		if (isRecording) {
			stopRecording();
		}
	};

	const handleSubmit = async () => {
		if (isSubmitting) return;
		if (!user) {
			toast({
				variant: 'destructive',
				title: 'No autenticado',
				description: 'Debes iniciar sesión para continuar.',
			});
			return;
		}

		if (!title.trim()) {
			toast({
				variant: 'destructive',
				title: 'Falta el título',
				description: 'El módulo debe tener un título.',
			});
			return;
		}

		if (!work) {
			toast({
				variant: 'destructive',
				title: 'Falta la obra',
				description: 'Seleccioná la obra a la que corresponde el módulo.',
			});
			return;
		}

		setIsSubmitting(true);

		try {
			let moduleId: number;

			if (isEditing && moduleToEdit) {
				const { data, error } = await updateModule(moduleToEdit.id, {
					title: title.trim(),
					description: description.trim() || null,
					work_id: work.id,
				});

				if (error || !data) {
					throw error || new Error('No se pudo actualizar el módulo');
				}

				moduleId = moduleToEdit.id;

				const currentExistingIds = files
					.filter((f) => f.existingId)
					.map((f) => f.existingId as number);
				const removedIds =
					getOriginalExistingIds().filter((id) => !currentExistingIds.includes(id)) ?? [];

				const cleanupResults = await Promise.all(
					removedIds.map(async (id) => {
						const { success, error } = await deleteModuleFile(id);
						return { id, success, error };
					})
				);

				const cleanupErrors = cleanupResults.filter((r) => !r.success);
				if (cleanupErrors.length > 0) {
					toast({
						variant: 'destructive',
						title: 'Error eliminando archivos',
						description: `${cleanupErrors.length} archivo(s) no se pudieron eliminar.`,
					});
				}
			} else {
				const { data: moduleData, error: moduleError } = await createModule({
					title: title.trim(),
					description: description.trim() || null,
					work_id: work.id,
					user_id: user.uid,
					status: 'not_send',
				});

				if (moduleError || !moduleData) {
					throw moduleError || new Error('No se pudo crear el módulo');
				}

				moduleId = moduleData.id;
			}

			const uploadResults = await Promise.all(
				files
					.filter((f) => !f.existingId)
					.map(async (pending) => {
						const fileToUpload = pending.editedFile || pending.file;
						if (!fileToUpload) return { name: pending.displayName, error: 'Sin archivo' };
						const { error } = await uploadModuleFile(
							moduleId,
							fileToUpload,
							pending.description.trim() || null,
							pending.displayName.trim() || null
						);
						return { name: pending.displayName, error };
					})
			);

			const existingFileErrors: any[] = [];
			await Promise.all(
				files
					.filter((f) => f.existingId)
					.map(async (pending) => {
						if (pending.editedFile || pending.file) {
							const fileToUpload = pending.editedFile || pending.file!;
							const { data: uploaded, error } = await uploadModuleFile(
								moduleId,
								fileToUpload,
								pending.description.trim() || null,
								pending.displayName.trim() || null
							);
							if (error || !uploaded) {
								existingFileErrors.push({
									name: pending.displayName,
									error: error || 'No se pudo subir el reemplazo',
								});
								return;
							}

							const { success, error: deleteError } = await deleteModuleFile(pending.existingId!);
							if (!success) {
								const { error: rollbackError } = await deleteModuleFile(uploaded.id);
								existingFileErrors.push({
									name: pending.displayName,
									error: deleteError,
									...(!rollbackError ? {} : { rollbackError }),
								});
							}
							return;
						}

						const { error } = await updateModuleFile(pending.existingId!, {
							file_name: pending.displayName.trim() || null,
							description: pending.description.trim() || null,
						});
						if (error) {
							existingFileErrors.push({ name: pending.displayName, error });
						}
					})
			);

			const totalErrors = uploadResults.filter((r) => r.error).length + existingFileErrors.length;

			if (totalErrors > 0) {
				console.error('Errores procesando archivos del módulo:', {
					uploadErrors: uploadResults.filter((r) => r.error),
					existingFileErrors,
				});
				toast({
					variant: 'destructive',
					title: isEditing
						? 'Módulo actualizado, pero hubo errores con archivos'
						: 'Módulo creado, pero hubo errores al subir archivos',
					description: `${totalErrors} archivo(s) no se pudieron procesar.`,
				});
			} else {
				toast({
					title: isEditing ? 'Módulo actualizado' : 'Módulo creado',
					description: isEditing
						? 'El módulo se actualizó correctamente.'
						: 'El módulo se creó correctamente y quedó como "no enviado".',
				});
			}

			onCreated?.(moduleToEdit ?? ({ id: moduleId } as Module));
			onOpenChange?.(false);
			setIsOpen(false);
			resetForm();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: isEditing ? 'Error al actualizar el módulo' : 'Error al crear el módulo',
				description: translateError(error) || 'Ocurrió un error al procesar el módulo.',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<Dialog
				open={isOpen}
				onOpenChange={(next) => {
					if (!next && isRecording) {
						stopRecording();
					}
					onOpenChange ? onOpenChange(next) : setIsOpen(next);
				}}
			>
				<DialogContent className="min-w-0 w-[95vw] sm:max-w-3xl max-h-[92dvh] overflow-y-auto p-4 md:p-6">
					<DialogHeader className="text-left">
						<DialogTitle className="text-lg md:text-xl">
							{isEditing ? 'Editar módulo' : 'Nuevo módulo'}
						</DialogTitle>
						<DialogDescription className="text-sm">
							{isEditing
								? 'Actualizá los datos del módulo y sus archivos.'
								: 'Completá los datos del módulo y adjuntá imágenes o videos.'}
						</DialogDescription>
					</DialogHeader>

					{(error || errorFiles) && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>
								{error && <p>{error}</p>}
								{errorFiles && <p>{errorFiles}</p>}
							</AlertDescription>
						</Alert>
					)}

					<InputsFormModule
						title={title}
						description={description}
						works={works}
						work={work}
						workPopoverOpen={workPopoverOpen}
						files={files}
						isRecording={isRecording}
						recordingTime={recordingTime}
						recordingSize={recordingSize}
						videoPreviewRef={videoPreviewRef}
						fileInputRef={fileInputRef}
						onTitleChange={setTitle}
						onDescriptionChange={setDescription}
						onWorkPopoverOpenChange={setWorkPopoverOpen}
						onWorkSelect={(selectedWork) => {
							setWork(selectedWork);
							setWorkPopoverOpen(false);
						}}
						onAddFiles={addFiles}
						onRemoveFile={removeFile}
						onUpdateFileField={updateFileField}
						onRemoveAllFiles={removeAllFiles}
						onTakePhoto={openEditorForNew}
						onEditFile={openEditorForEdit}
						onToggleRecording={toggleRecording}
						formatTime={formatTimeVideo}
					/>

					<DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
						<Button
							variant="outline"
							type="button"
							onClick={() => {
								if (isRecording) stopRecording();
								setIsOpen(false);
								onOpenChange?.(false);
							}}
							disabled={isSubmitting}
							className="w-full sm:w-auto"
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={handleSubmit}
							disabled={isSubmitting}
							className="w-full sm:w-auto"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Guardando...
								</>
							) : (
								<>
									<Check className="h-4 w-4 mr-2" />
									{isEditing ? 'Guardar cambios' : 'Crear módulo'}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ImageEditorDialog
				open={editorOpen}
				onOpenChange={(open) => {
					if (!open) {
						closeEditor();
					}
				}}
				onImageReady={handleImageReady}
				initialFile={fileForEditor}
			/>
		</>
	);
}
