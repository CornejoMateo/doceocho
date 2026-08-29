import {
	IMAGE_TYPES,
	VIDEO_TYPES,
	DOCUMENT_TYPES,
	CLIENT_FILE_TYPES,
	CLAIM_FILE_TYPES,
	MAX_FILE_SIZE_CLIENT,
	MAX_FILE_SIZE_CLAIM,
	MAX_MODULE_IMAGE_SIZE,
	MAX_MODULE_VIDEO_SIZE,
	formatDate,
	formatFileSize,
	getFileExtension,
	getFileKind,
	isDocument,
	isImage,
	isValidFileSize,
	isValidFileType,
	isVideo,
	validateFileForUpload,
} from '@/utils/file-upload-utils';

describe('file-upload-utils', () => {
	describe('isValidFileType', () => {
		it('returns true for allowed file type', () => {
			const file = new File(['img'], 'photo.jpg', {
				type: 'image/jpeg',
			});

			expect(isValidFileType(file, IMAGE_TYPES)).toBe(true);
		});

		it('returns false for invalid file type', () => {
			const file = new File(['pdf'], 'doc.pdf', {
				type: 'application/pdf',
			});

			expect(isValidFileType(file, IMAGE_TYPES)).toBe(false);
		});
	});

	describe('isValidFileSize', () => {
		it('returns true when file size is below limit', () => {
			const file = new File(['small'], 'small.jpg');

			Object.defineProperty(file, 'size', {
				value: 1024,
			});

			expect(isValidFileSize(file, 2048)).toBe(true);
		});

		it('returns false when file size exceeds limit', () => {
			const file = new File(['big'], 'big.jpg');

			Object.defineProperty(file, 'size', {
				value: 5000,
			});

			expect(isValidFileSize(file, 2048)).toBe(false);
		});
	});

	describe('formatFileSize', () => {
		it('formats bytes correctly', () => {
			expect(formatFileSize(500)).toBe('500 Bytes');
		});

		it('formats KB correctly', () => {
			expect(formatFileSize(1024)).toBe('1 KB');
		});

		it('formats MB correctly', () => {
			expect(formatFileSize(1024 * 1024)).toBe('1 MB');
		});

		it('formats GB correctly', () => {
			expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
		});

		it('handles decimal sizes correctly', () => {
			expect(formatFileSize(1536)).toBe('1.5 KB');
		});

		it('returns 0 Bytes for zero', () => {
			expect(formatFileSize(0)).toBe('0 Bytes');
		});
	});

	describe('validateFileForUpload', () => {
		it('returns valid for supported file type and size', () => {
			const file = new File(['img'], 'photo.jpg', {
				type: 'image/jpeg',
			});

			Object.defineProperty(file, 'size', {
				value: 1024,
			});

			expect(validateFileForUpload(file, IMAGE_TYPES, MAX_FILE_SIZE_CLAIM)).toEqual({
				isValid: true,
			});
		});

		it('returns invalid for unsupported file type', () => {
			const file = new File(['exe'], 'virus.exe', {
				type: 'application/x-msdownload',
			});

			Object.defineProperty(file, 'size', {
				value: 1024,
			});

			const result = validateFileForUpload(file, IMAGE_TYPES, MAX_FILE_SIZE_CLAIM);

			expect(result.isValid).toBe(false);

			expect(result.error).toContain('Tipo de archivo no válido');
		});

		it('returns invalid when file exceeds size limit', () => {
			const file = new File(['big'], 'video.mp4', {
				type: 'video/mp4',
			});

			Object.defineProperty(file, 'size', {
				value: 100 * 1024 * 1024,
			});

			const result = validateFileForUpload(file, CLIENT_FILE_TYPES, MAX_FILE_SIZE_CLIENT);

			expect(result.isValid).toBe(false);

			expect(result.error).toContain('El archivo excede el tamaño máximo');
		});
	});

	describe('file type helpers', () => {
		it('detects image mimetypes', () => {
			expect(isImage('image/png')).toBe(true);
			expect(isImage('video/mp4')).toBe(false);
		});

		it('detects video mimetypes', () => {
			expect(isVideo('video/mp4')).toBe(true);
			expect(isVideo('image/png')).toBe(false);
		});

		it('detects document mimetypes', () => {
			expect(isDocument('application/pdf')).toBe(true);
			expect(isDocument('image/png')).toBe(false);
			expect(isDocument('video/mp4')).toBe(false);
		});
	});

	describe('getFileExtension', () => {
		it('returns uppercase extension', () => {
			expect(getFileExtension('photo.jpg')).toBe('JPG');
		});

		it('handles filenames with multiple dots', () => {
			expect(getFileExtension('backup.final.pdf')).toBe('PDF');
		});

		it('returns FILE when no extension exists', () => {
			expect(getFileExtension('README')).toBe('FILE');
		});

		it('handles lowercase extensions', () => {
			expect(getFileExtension('video.mp4')).toBe('MP4');
		});
	});

	describe('formatDate', () => {
		it('formats valid date correctly', () => {
			const result = formatDate('2024-01-15T10:30:00Z');

			expect(result).toContain('2024');
		});

		it('returns empty string for empty input', () => {
			expect(formatDate('')).toBe('');
		});

		it('handles invalid dates gracefully', () => {
			const result = formatDate('invalid-date');

			expect(typeof result).toBe('string');
		});
	});

	describe('getFileKind', () => {
		it('detects image files by extension', () => {
			expect(getFileKind('foto.jpg')).toBe('image');
			expect(getFileKind('FOTO.PNG')).toBe('image');
			expect(getFileKind('plano.webp')).toBe('image');
		});

		it('detects video files by extension', () => {
			expect(getFileKind('video.mp4')).toBe('video');
			expect(getFileKind('rec.webm')).toBe('video');
			expect(getFileKind('grabacion.MOV')).toBe('video');
		});

		it('returns file for anything else', () => {
			expect(getFileKind('documento.pdf')).toBe('file');
			expect(getFileKind('README')).toBe('file');
			expect(getFileKind('imagen')).toBe('file');
		});
	});

	describe('constants', () => {
		it('contains expected image types', () => {
			expect(IMAGE_TYPES).toContain('image/jpeg');
			expect(IMAGE_TYPES).toContain('image/webp');
		});

		it('claim file types should equal image types', () => {
			expect(CLAIM_FILE_TYPES).toEqual(IMAGE_TYPES);
		});

		it('client file types should include videos and documents', () => {
			expect(CLIENT_FILE_TYPES).toContain('video/mp4');

			expect(CLIENT_FILE_TYPES).toContain('application/pdf');
		});

		it('document types should contain pdf', () => {
			expect(DOCUMENT_TYPES).toContain('application/pdf');
		});

		it('video types should contain mp4', () => {
			expect(VIDEO_TYPES).toContain('video/mp4');
		});

		it('module image limit should be 10MB and video limit 50MB', () => {
			expect(MAX_MODULE_IMAGE_SIZE).toBe(10 * 1024 * 1024);
			expect(MAX_MODULE_VIDEO_SIZE).toBe(50 * 1024 * 1024);
		});

		it('module image limit accepts files within the module limits', () => {
			const smallImage = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
			Object.defineProperty(smallImage, 'size', { value: 5 * 1024 * 1024 });

			const smallVideo = new File(['vid'], 'clip.mp4', { type: 'video/mp4' });
			Object.defineProperty(smallVideo, 'size', { value: 40 * 1024 * 1024 });

			expect(isValidFileSize(smallImage, MAX_MODULE_IMAGE_SIZE)).toBe(true);
			expect(isValidFileSize(smallVideo, MAX_MODULE_VIDEO_SIZE)).toBe(true);
		});

		it('module limits reject oversized images and videos', () => {
			const oversizedImage = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
			Object.defineProperty(oversizedImage, 'size', { value: 11 * 1024 * 1024 });

			const oversizedVideo = new File(['vid'], 'clip.mp4', { type: 'video/mp4' });
			Object.defineProperty(oversizedVideo, 'size', { value: 51 * 1024 * 1024 });

			expect(isValidFileSize(oversizedImage, MAX_MODULE_IMAGE_SIZE)).toBe(false);
			expect(isValidFileSize(oversizedVideo, MAX_MODULE_VIDEO_SIZE)).toBe(false);
		});
	});
});
