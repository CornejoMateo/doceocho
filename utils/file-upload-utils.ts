/**
 * Utility functions for file upload validation and formatting
 * Shared between client files and claim images galleries
 */

// Image file types (common for both clients and claims)
export const IMAGE_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/gif',
	'image/webp',
] as const;

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] as const;

// Video file types (only for clients)
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'] as const;

// Document file types (for clients)
export const DOCUMENT_TYPES = [
	'application/pdf',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'text/csv',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'text/plain',
	'application/zip',
	'application/x-zip-compressed',
] as const;

// All supported file types for clients (images + videos + documents)
export const CLIENT_FILE_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOCUMENT_TYPES] as const;

// Only image types for claims
export const CLAIM_FILE_TYPES = IMAGE_TYPES;

// File size limits
export const MAX_FILE_SIZE_CLIENT = 50 * 1024 * 1024; // 50MB
export const MAX_FILE_SIZE_CLAIM = 10 * 1024 * 1024; // 10MB

// Module file size limits
export const MAX_MODULE_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
export const MAX_MODULE_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB for videos

/**
 * Validates if a file type is supported
 */
export const isValidFileType = (file: File, allowedTypes: readonly string[]): boolean => {
	return allowedTypes.includes(file.type);
};

/**
 * Validates if a file size is within the allowed limit
 */
export const isValidFileSize = (file: File, maxSize: number): boolean => {
	return file.size <= maxSize;
};

/**
 * Formats file size in bytes to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validates a file for upload (type and size)
 */
export const validateFileForUpload = (
	file: File,
	allowedTypes: readonly string[],
	maxSize: number
): { isValid: boolean; error?: string } => {
	if (!isValidFileType(file, allowedTypes)) {
		const typeNames = allowedTypes.map((type) => type.split('/')[1].toUpperCase()).join(', ');
		return {
			isValid: false,
			error: `Tipo de archivo no válido. Solo se permiten archivos: ${typeNames}.`,
		};
	}

	if (!isValidFileSize(file, maxSize)) {
		const maxSizeMB = Math.round(maxSize / (1024 * 1024));
		return {
			isValid: false,
			error: `El archivo excede el tamaño máximo de ${maxSizeMB}MB.`,
		};
	}

	return { isValid: true };
};

/**
 * Checks if a mimetype is an image
 */
export const isImage = (mimetype: string): boolean => {
	return mimetype.startsWith('image/');
};

/**
 * Checks if a mimetype is a video
 */
export const isVideo = (mimetype: string): boolean => {
	return mimetype.startsWith('video/');
};

/**
 * Checks if a mimetype is a document
 */
export const isDocument = (mimetype: string): boolean => {
	return !isImage(mimetype) && !isVideo(mimetype);
};

/**
 * Gets a file extension from filename
 */
export const getFileExtension = (filename: string): string => {
	const parts = filename.split('.');
	return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
};

export const getFileKind = (fileName: string) => {
	const extension = getFileExtension(fileName).toLowerCase();

	if ((IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
		return 'image';
	}

	if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) {
		return 'video';
	}

	return 'file';
};

/**
 * Formats a date string to localized format
 */
export const formatDate = (dateString: string): string => {
	if (!dateString) return '';
	const date = new Date(dateString);
	return date.toLocaleDateString('es-AR', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

// type created for the file viewer modal
export type FileViewerItem = {
	id: number;
	url: string;
	name: string;
	displayName?: string | null;
	description?: string | null;
	mimetype?: string | null;
	size?: number | null;
	uploadedAt?: string | null;
};
