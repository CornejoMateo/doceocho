import { useState, useRef } from 'react';
import { uploadClientFile } from '@/lib/clients/files';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	CLIENT_FILE_TYPES,
	MAX_FILE_SIZE_CLAIM,
	MAX_FILE_SIZE_CLIENT,
	validateFileForUpload,
} from '@/utils/file-upload-utils';
import { optimizeFile } from '@/utils/optimization-images';

interface UseFileUploadOptions {
	clientId?: number;
	claimId?: number | null;
	allowedFileTypes?: readonly string[];
	maxFileSize?: number;
	getDefaultDisplayName?: (file: File) => string;
	getDefaultDescription?: (file: File) => string;
	uploadFile?: (
		file: File,
		title: string | null,
		description: string | null
	) => Promise<{ error: any }>;
	beforeUpload?: () => string | null;
	onUploadSuccess?: () => void;
	onImageFileSelect?: (file: File) => void;
}

export function useFileUpload({
	clientId,
	claimId,
	allowedFileTypes = CLIENT_FILE_TYPES,
	maxFileSize,
	getDefaultDisplayName,
	getDefaultDescription,
	uploadFile,
	beforeUpload,
	onUploadSuccess,
	onImageFileSelect,
}: UseFileUploadOptions) {
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [displayName, setDisplayName] = useState('');
	const [description, setDescription] = useState('');
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const maxUploadSize = maxFileSize ?? (claimId ? MAX_FILE_SIZE_CLAIM : MAX_FILE_SIZE_CLIENT);

	const prepareFileForUpload = (file: File) => {
		const validation = validateFileForUpload(file, allowedFileTypes, maxUploadSize);
		if (!validation.isValid) {
			toast({
				variant: 'destructive',
				title: 'Archivo no válido',
				description: validation.error,
			});
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
			return false;
		}

		setSelectedFile(file);
		setDisplayName(getDefaultDisplayName?.(file) || file.name.replace(/\.[^/.]+$/, ''));
		setDescription(getDefaultDescription?.(file) || '');
		setIsUploadDialogOpen(true);
		return true;
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files;
		if (!selectedFiles || selectedFiles.length === 0) return;

		const file = selectedFiles[0];

		if (file.type.startsWith('image/') && onImageFileSelect) {
			const validation = validateFileForUpload(file, allowedFileTypes, maxUploadSize);
			if (!validation.isValid) {
				toast({
					variant: 'destructive',
					title: 'Archivo no válido',
					description: validation.error,
				});
				if (fileInputRef.current) {
					fileInputRef.current.value = '';
				}
				return;
			}
			onImageFileSelect(file);
		} else {
			prepareFileForUpload(file);
		}
	};

	const handleUploadSubmit = async () => {
		if (!selectedFile) return;

		if (!uploadFile && !clientId) {
			toast({
				variant: 'destructive',
				title: 'No se puede subir archivo',
				description: 'No se ha especificado un destino para la subida del archivo.',
			});
			return;
		}

		const preUploadError = beforeUpload?.();
		if (preUploadError) {
			const error = translateError(preUploadError);
			toast({
				variant: 'destructive',
				title: 'No se puede subir archivo',
				description: error || preUploadError,
			});
			return;
		}

		setIsUploading(true);

		try {
			const optimizedFile = await optimizeFile(selectedFile);

			const { error } = uploadFile
				? await uploadFile(optimizedFile, displayName.trim() || null, description.trim() || null)
				: await uploadClientFile(clientId!, optimizedFile, {
						title: displayName.trim() || null,
						description: description.trim() || null,
					});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al subir archivo',
					description: translateError(error),
				});
			} else {
				toast({
					title: 'Archivo subido',
					description: 'El archivo se subió exitosamente.',
				});
				handleCloseUploadDialog();
				onUploadSuccess?.();
			}
		} catch (error) {
			console.error('Error uploading file:', error);
			toast({
				variant: 'destructive',
				title: 'Error al subir archivo',
				description: translateError(error),
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleCloseUploadDialog = () => {
		setIsUploadDialogOpen(false);
		setSelectedFile(null);
		setDisplayName('');
		setDescription('');
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const triggerFileUpload = () => {
		fileInputRef.current?.click();
	};

	const openUploadDialogForFile = (file: File) => {
		return prepareFileForUpload(file);
	};

	return {
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
		triggerFileUpload,
		openUploadDialogForFile,
		acceptedFileTypes: allowedFileTypes,
	};
}
