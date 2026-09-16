'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
	uploadModuleFile,
	updateModuleFile,
	deleteModuleFile,
	ModuleFile,
} from '@/lib/modules/modules-files';
import { resubmitAllRejectedFilesAction } from '@/lib/modules/modules-files-resubmit';
import { translateError } from '@/lib/error-translator';
import { ModuleFileWithUrl } from './use-module-details-files';

interface UseModuleFileCorrectionOptions {
	open: boolean;
	moduleId: number | null;
	files: ModuleFileWithUrl[];
	patchFile: (id: number, patch: Partial<ModuleFileWithUrl>) => void;
	replaceFile: (oldId: number, newFile: ModuleFile) => Promise<void>;
	onReviewed?: () => void;
}

export function useModuleFileCorrection({
	open,
	moduleId,
	files,
	patchFile,
	replaceFile,
	onReviewed,
}: UseModuleFileCorrectionOptions) {
	const [correctingFileId, setCorrectingFileId] = useState<number | null>(null);
	const [correctionDescription, setCorrectionDescription] = useState('');
	const [correctionFile, setCorrectionFile] = useState<File | null>(null);
	const [isSavingCorrection, setIsSavingCorrection] = useState(false);
	const [isResubmittingAll, setIsResubmittingAll] = useState(false);

	useEffect(() => {
		if (!open) {
			setCorrectingFileId(null);
			setCorrectionDescription('');
			setCorrectionFile(null);
			setIsSavingCorrection(false);
			setIsResubmittingAll(false);
		}
	}, [open]);

	const startFileCorrection = (file: ModuleFileWithUrl) => {
		setCorrectingFileId(file.id);
		setCorrectionDescription(file.description || '');
		setCorrectionFile(null);
	};

	const cancelFileCorrection = () => {
		setCorrectingFileId(null);
		setCorrectionDescription('');
		setCorrectionFile(null);
		setIsSavingCorrection(false);
	};

	const saveFileCorrection = async (file: ModuleFileWithUrl) => {
		setIsSavingCorrection(true);
		const trimmedDescription = correctionDescription.trim() || null;

		if (correctionFile) {
			if (!moduleId) {
				setIsSavingCorrection(false);
				return;
			}

			const { data: uploaded, error: uploadError } = await uploadModuleFile(
				moduleId,
				correctionFile,
				trimmedDescription,
				file.file_name
			);
			if (uploadError || !uploaded) {
				toast({
					variant: 'destructive',
					title: 'Error al reemplazar el archivo',
					description: translateError(uploadError) || 'No se pudo subir el archivo de reemplazo.',
				});
				setIsSavingCorrection(false);
				return;
			}

			const { success: deleteSuccess, error: deleteError } = await deleteModuleFile(file.id);
			if (!deleteSuccess) {
				await deleteModuleFile(uploaded.id);
				toast({
					variant: 'destructive',
					title: 'Error al reemplazar el archivo',
					description: translateError(deleteError) || 'No se pudo eliminar el archivo original.',
				});
				setIsSavingCorrection(false);
				return;
			}

			toast({
				title: 'Archivo corregido',
				description:
					'El archivo se reemplazó correctamente y ya vuelve a estar pendiente de revisión.',
			});

			await replaceFile(file.id, uploaded);
			cancelFileCorrection();
			onReviewed?.();
		} else {
			const { error } = await updateModuleFile(file.id, { description: trimmedDescription });
			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al guardar los cambios',
					description: translateError(error) || 'No se pudo actualizar la descripción.',
				});
				setIsSavingCorrection(false);
				return;
			}

			patchFile(file.id, { description: trimmedDescription });

			toast({
				title: 'Archivo corregido',
				description:
					'Los cambios se guardaron. Recordá tocar "Solicitar revisión" para que el admin lo vuelva a evaluar.',
			});
			cancelFileCorrection();
		}
	};

	const resubmitAllRejectedFiles = async () => {
		if (!moduleId) return;
		const rejectedFileIds = files.filter((f) => f.status === 'rejected').map((f) => f.id);
		setIsResubmittingAll(true);
		const { success, error, warning } = await resubmitAllRejectedFilesAction(moduleId);
		if (!success) {
			toast({
				variant: 'destructive',
				title: 'Error al solicitar la revisión',
				description: error || 'Ocurrió un error al reenviar los archivos a revisión.',
			});
			setIsResubmittingAll(false);
			return;
		}

		rejectedFileIds.forEach((id) => patchFile(id, { status: null }));
		toast({
			title: 'Revisión solicitada',
			description:
				'Los archivos rechazados vuelven a quedar pendientes de revisión por un administrador.',
		});
		if (warning) {
			toast({
				variant: 'destructive',
				title: 'Atención',
				description: warning,
			});
		}
		setIsResubmittingAll(false);
		onReviewed?.();
	};

	return {
		correctingFileId,
		correctionDescription,
		setCorrectionDescription,
		correctionFile,
		setCorrectionFile,
		isSavingCorrection,
		isResubmittingAll,
		startFileCorrection,
		cancelFileCorrection,
		saveFileCorrection,
		resubmitAllRejectedFiles,
	};
}
