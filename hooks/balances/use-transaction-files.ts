'use client';

import { useState, useCallback } from 'react';
import { BalanceTransaction } from '@/lib/balances/balance_transactions';
import { BalanceWithBudget } from '@/lib/balances/balances';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { getSupabaseClient } from '@/lib/supabase-client';
import {
	deleteClientFile,
	getClientFilesByTransaction,
	uploadClientFile,
} from '@/lib/clients/files';
import { FileViewerItem } from '@/utils/file-upload-utils';
import { optimizeFile } from '@/utils/optimization-images';

export function useTransactionFiles(balance: BalanceWithBudget | null) {
	const { toast } = useToast();

	const [transactionForFiles, setTransactionForFiles] = useState<BalanceTransaction | null>(null);
	const [transactionFiles, setTransactionFiles] = useState<FileViewerItem[]>([]);
	const [isLoadingFiles, setIsLoadingFiles] = useState(false);
	const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
	const [transactionFileToDelete, setTransactionFileToDelete] = useState<number | null>(null);
	const [isUploadingFiles, setIsUploadingFiles] = useState(false);

	const uploadFilesForTransaction = async (transactionId: number, files: File[]) => {
		if (!balance || files.length === 0) return;

		const clientId = (balance as any)?.client_id;

		if (!clientId) {
			toast({
				variant: 'destructive',
				title: 'Error al subir archivos',
				description: 'No se encontró el cliente asociado a esta transacción.',
			});
			return;
		}

		for (const file of files) {
			try {
				const optimizedFile = await optimizeFile(file);

				const { error } = await uploadClientFile(
					clientId,
					optimizedFile,
					null,
					null,
					null,
					transactionId
				);

				if (error) {
					const err = translateError(error);
					toast({
						variant: 'destructive',
						title: 'Error al subir archivo',
						description: err || `Hubo un problema al subir el archivo ${file.name}.`,
					});
				} else {
					toast({
						title: 'Archivos subidos',
						description: 'Los archivos se han subido exitosamente.',
					});
				}
			} catch (error) {
				const err = translateError(error);
				toast({
					variant: 'destructive',
					title: 'Error al subir archivo',
					description: err || `Hubo un problema al subir el archivo ${file.name}.`,
				});
			}
		}
	};

	const loadTransactionFiles = useCallback(async (transactionId: number) => {
		setIsLoadingFiles(true);
		try {
			const { data, error } = await getClientFilesByTransaction(transactionId);

			if (error) {
				const err = translateError(error);
				toast({
					variant: 'destructive',
					title: 'Error al cargar archivos',
					description: err || 'Hubo un problema al cargar los archivos.',
				});
				setTransactionFiles([]);
				return;
			}

			if (!data || data.length === 0) {
				setTransactionFiles([]);
				return;
			}

			const supabase = getSupabaseClient();
			const filesWithUrls: (FileViewerItem | null)[] = await Promise.all(
				data.map(async (file) => {
					try {
						if (!file.path) return null;

						const { data: blob, error: downloadError } = await supabase.storage
							.from('clients')
							.download(file.path);

						if (downloadError || !blob) {
							console.error('Error downloading file:', file.path, downloadError);
							return null;
						}

						const url = URL.createObjectURL(blob);
						const name = file.path.split('/').pop() || 'archivo';

						return {
							id: file.id,
							url,
							name,
							displayName: file.title,
							description: file.description,
							size: blob.size,
							uploadedAt: file.uploaded_at || new Date().toISOString(),
						} as FileViewerItem;
					} catch (err) {
						const errorMessage = translateError(err);
						toast({
							variant: 'destructive',
							title: 'Error al procesar archivo',
							description: errorMessage || 'Hubo un problema al procesar un archivo.',
						});
						return null;
					}
				})
			);

			const validFiles = filesWithUrls.filter((f): f is FileViewerItem => f !== null);
			setTransactionFiles(validFiles);
		} catch (error) {
			const err = translateError(error);
			toast({
				variant: 'destructive',
				title: 'Error al cargar archivos',
				description: err || 'Hubo un problema al cargar los archivos.',
			});
			setTransactionFiles([]);
		} finally {
			setIsLoadingFiles(false);
		}
	}, []);

	const handleViewTransactionFiles = (transaction: BalanceTransaction) => {
		setTransactionForFiles(transaction);
		loadTransactionFiles(transaction.id);
	};

	const handleDeleteTransactionFile = async () => {
		if (!transactionFileToDelete) return;

		try {
			const { success, error } = await deleteClientFile(transactionFileToDelete);

			if (error || !success) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar archivo',
					description:
						translateError(error?.message || error) || 'Hubo un problema al eliminar el archivo.',
				});
			} else {
				toast({
					title: 'Archivo eliminado',
					description: 'El archivo se eliminó exitosamente.',
				});
				if (transactionForFiles) {
					await loadTransactionFiles(transactionForFiles.id);
				}
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error',
				description: 'Ocurrió un error inesperado al eliminar el archivo.',
			});
		} finally {
			setTransactionFileToDelete(null);
		}
	};

	const handleUploadFilesFromGallery = async (clientId: number, files: File[]) => {
		if (!transactionForFiles) return;

		setIsUploadingFiles(true);
		for (const file of files) {
			try {
				const optimizedFile = await optimizeFile(file);
				const { error } = await uploadClientFile(
					clientId,
					optimizedFile,
					null,
					null,
					null,
					transactionForFiles.id
				);
				if (error) {
					const err = translateError(error);
					toast({
						variant: 'destructive',
						title: 'Error al subir archivo',
						description: err || `Hubo un problema al subir el archivo ${file.name}.`,
					});
				}
			} catch (err) {
				const errorMessage = translateError(err);
				toast({
					variant: 'destructive',
					title: 'Error al subir archivo',
					description: errorMessage || `Hubo un problema al subir el archivo ${file.name}.`,
				});
			}
		}
		await loadTransactionFiles(transactionForFiles.id);
		setIsUploadingFiles(false);
	};

	const handleCloseGallery = () => {
		transactionFiles.forEach((f) => {
			if (f.url) URL.revokeObjectURL(f.url);
		});
		setTransactionForFiles(null);
		setTransactionFiles([]);
	};

	return {
		transactionForFiles,
		setTransactionForFiles,
		transactionFiles,
		isLoadingFiles,
		selectedFileIndex,
		setSelectedFileIndex,
		transactionFileToDelete,
		setTransactionFileToDelete,
		isUploadingFiles,
		uploadFilesForTransaction,
		loadTransactionFiles,
		handleViewTransactionFiles,
		handleDeleteTransactionFile,
		handleUploadFilesFromGallery,
		handleCloseGallery,
	};
}
