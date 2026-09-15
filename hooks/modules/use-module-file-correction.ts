'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { uploadModuleFile, updateModuleFile, deleteModuleFile } from '@/lib/modules/modules-files';
import {
	resubmitModuleFileAction,
	syncModuleStatusAction,
} from '@/lib/modules/modules-files-resubmit';
import { translateError } from '@/lib/error-translator';
import { ModuleFileWithUrl } from './use-module-details-files';

interface UseModuleFileCorrectionOptions {
	open: boolean;
	moduleId: number | null;
	patchFile: (id: number, patch: Partial<ModuleFileWithUrl>) => void;
	reload: () => void;
	onReviewed?: () => void;
}

export function useModuleFileCorrection({
	open,
	moduleId,
	patchFile,
	reload,
	onReviewed,
}: UseModuleFileCorrectionOptions) {
	const [correctingFileId, setCorrectingFileId] = useState<number | null>(null);
	const [correctionDescription, setCorrectionDescription] = useState('');
	const [correctionFile, setCorrectionFile] = useState<File | null>(null);
	const [isSavingCorrection, setIsSavingCorrection] = useState(false);
	const [resubmittingFileId, setResubmittingFileId] = useState<number | null>(null);

	useEffect(() => {
		if (!open) {
			setCorrectingFileId(null);
			setCorrectionDescription('');
			setCorrectionFile(null);
			setIsSavingCorrection(false);
			setResubmittingFileId(null);
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

			const { success: syncSuccess, warning: syncWarning } = await syncModuleStatusAction(moduleId);
			if (!syncSuccess || syncWarning) {
				toast({
					variant: 'destructive',
					title: 'Atención',
					description:
						syncWarning ||
						'El archivo se reemplazó, pero no se pudo actualizar el estado general del módulo.',
				});
			}

			toast({
				title: 'Archivo corregido',
				description:
					'El archivo se reemplazó correctamente y ya vuelve a estar pendiente de revisión.',
			});
			cancelFileCorrection();

			reload();
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
					'Los cambios se guardaron. Recordá tocar "Reenviar a revisión" para que el admin lo vuelva a evaluar.',
			});
			cancelFileCorrection();
		}
	};

	const resubmitFile = async (file: ModuleFileWithUrl) => {
		setResubmittingFileId(file.id);
		const { success, error, warning } = await resubmitModuleFileAction(file.id);
		if (!success) {
			toast({
				variant: 'destructive',
				title: 'Error al reenviar el archivo',
				description: error || 'Ocurrió un error al reenviar el archivo a revisión.',
			});
			setResubmittingFileId(null);
			return;
		}
		toast({
			title: 'Archivo reenviado a revisión',
			description: 'El archivo vuelve a quedar pendiente de revisión por un administrador.',
		});
		if (warning) {
			toast({
				variant: 'destructive',
				title: 'Atención',
				description: warning,
			});
		}
		setResubmittingFileId(null);
		reload();
		onReviewed?.();
	};

	return {
		correctingFileId,
		correctionDescription,
		setCorrectionDescription,
		correctionFile,
		setCorrectionFile,
		isSavingCorrection,
		resubmittingFileId,
		startFileCorrection,
		cancelFileCorrection,
		saveFileCorrection,
		resubmitFile,
	};
}
