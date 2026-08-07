import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '@/hooks/use-file-upload';

import { uploadClientFile } from '@/lib/clients/files';
import { optimizeFile } from '@/utils/optimization-images';
import { toast } from '@/components/ui/use-toast';
import { validateFileForUpload } from '@/utils/file-upload-utils';

jest.mock('@/lib/clients/files', () => ({
	uploadClientFile: jest.fn(),
}));

jest.mock('@/utils/optimization-images', () => ({
	optimizeFile: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/utils/file-upload-utils', () => {
	const original = jest.requireActual('@/utils/file-upload-utils');

	return {
		...original,
		validateFileForUpload: jest.fn(),
	};
});

beforeEach(() => {
	jest.clearAllMocks();

	(validateFileForUpload as jest.Mock).mockReturnValue({
		isValid: true,
	});
});

describe('useFileUpload', () => {
	it('open the upload dialog for a selected file', () => {
		const { result } = renderHook(() => useFileUpload({ clientId: 1 }));
		const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });

		act(() => {
			result.current.openUploadDialogForFile(file);
		});

		expect(result.current.isUploadDialogOpen).toBe(true);
		expect(result.current.selectedFile).toBe(file);
		expect(result.current.displayName).toBe('foto');
	});

	it('if the file is invalid, it does not open the upload dialog', () => {
		(validateFileForUpload as jest.Mock).mockReturnValue({
			isValid: false,
			error: 'Archivo inválido',
		});

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
			})
		);

		const file = new File(['abc'], 'foto.exe', {
			type: 'application/octet-stream',
		});

		act(() => {
			result.current.openUploadDialogForFile(file);
		});

		expect(result.current.isUploadDialogOpen).toBe(false);
		expect(result.current.selectedFile).toBeNull();

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Archivo no válido',
			})
		);
	});

	it('uses the custom display name and description when provided', () => {
		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
				getDefaultDisplayName: () => 'Nombre personalizado',
				getDefaultDescription: () => 'Descripción personalizada',
			})
		);

		const file = new File(['abc'], 'foto.jpg', {
			type: 'image/jpeg',
		});

		act(() => {
			result.current.openUploadDialogForFile(file);
		});

		expect(result.current.displayName).toBe('Nombre personalizado');
		expect(result.current.description).toBe('Descripción personalizada');
	});

	it('if beforeUpload returns an error, it does not upload the file', async () => {
		const beforeUpload = jest.fn().mockReturnValue('No permitido');

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
				beforeUpload,
			})
		);

		const file = new File(['abc'], 'foto.jpg', {
			type: 'image/jpeg',
		});

		act(() => {
			result.current.openUploadDialogForFile(file);
		});

		await act(async () => {
			await result.current.handleUploadSubmit();
		});

		expect(uploadClientFile).not.toHaveBeenCalled();

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'No se puede subir archivo',
			})
		);
	});

	it('upload the file successfully', async () => {
		(optimizeFile as jest.Mock).mockResolvedValue(
			new File(['abc'], 'foto.jpg', {
				type: 'image/jpeg',
			})
		);

		(uploadClientFile as jest.Mock).mockResolvedValue({
			error: null,
		});

		const onUploadSuccess = jest.fn();

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 5,
				onUploadSuccess,
			})
		);

		const file = new File(['abc'], 'foto.jpg', {
			type: 'image/jpeg',
		});

		act(() => {
			result.current.openUploadDialogForFile(file);
		});

		await act(async () => {
			await result.current.handleUploadSubmit();
		});

		expect(optimizeFile).toHaveBeenCalledWith(file);

		expect(uploadClientFile).toHaveBeenCalled();

		expect(onUploadSuccess).toHaveBeenCalled();

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Archivo subido',
			})
		);

		expect(result.current.isUploadDialogOpen).toBe(false);
	});

	it('close dialog and clean state', () => {
		const file = new File(['foto'], 'foto.jpg', {
			type: 'image/jpeg',
		});

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
			})
		);

		act(() => {
			result.current.openUploadDialogForFile(file);
		});

		expect(result.current.isUploadDialogOpen).toBe(true);

		act(() => {
			result.current.handleCloseUploadDialog();
		});

		expect(result.current.isUploadDialogOpen).toBe(false);
		expect(result.current.selectedFile).toBeNull();
		expect(result.current.displayName).toBe('');
		expect(result.current.description).toBe('');
	});

	it('does not attempt to upload if no file is selected', async () => {
		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
			})
		);

		await act(async () => {
			await result.current.handleUploadSubmit();
		});

		expect(uploadClientFile).not.toHaveBeenCalled();
	});

	it('executes click on the input when calling triggerFileUpload', () => {
		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
			})
		);

		const click = jest.fn();

		result.current.fileInputRef.current = {
			click,
		} as any;

		act(() => {
			result.current.triggerFileUpload();
		});

		expect(click).toHaveBeenCalled();
	});

	it('handles unexpected errors during optimization', async () => {
		const file = new File(['foto'], 'foto.jpg', {
			type: 'image/jpeg',
		});

		(optimizeFile as jest.Mock).mockRejectedValue(new Error('boom'));

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
			})
		);

		act(() => {
			result.current.openUploadDialogForFile(file);
		});

		await act(async () => {
			await result.current.handleUploadSubmit();
		});

		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Error al subir archivo',
				variant: 'destructive',
			})
		);
	});

	it('routes an image file to onImageFileSelect when the callback is set', () => {
		const onImageFileSelect = jest.fn();

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
				onImageFileSelect,
			})
		);

		const file = new File(['foto'], 'foto.jpg', {
			type: 'image/jpeg',
		});
		const event = {
			target: { files: [file] },
		} as unknown as React.ChangeEvent<HTMLInputElement>;

		act(() => {
			result.current.handleFileSelect(event);
		});

		expect(onImageFileSelect).toHaveBeenCalledWith(file);
		expect(validateFileForUpload).toHaveBeenCalledWith(file, expect.anything(), expect.anything());
		expect(result.current.isUploadDialogOpen).toBe(false);
		expect(result.current.selectedFile).toBeNull();
	});

	it('rejects an invalid image before handing it to onImageFileSelect', () => {
		(validateFileForUpload as jest.Mock).mockReturnValue({
			isValid: false,
			error: 'El archivo supera el tamaño máximo permitido',
		});

		const onImageFileSelect = jest.fn();

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
				onImageFileSelect,
			})
		);

		const file = new File(['foto'], 'foto.jpg', {
			type: 'image/jpeg',
		});
		const event = {
			target: { files: [file] },
		} as unknown as React.ChangeEvent<HTMLInputElement>;

		act(() => {
			result.current.handleFileSelect(event);
		});

		expect(onImageFileSelect).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Archivo no válido',
				variant: 'destructive',
			})
		);
		expect(result.current.isUploadDialogOpen).toBe(false);
		expect(result.current.selectedFile).toBeNull();
	});

	it('routes a non-image file to prepareFileForUpload', () => {
		const onImageFileSelect = jest.fn();

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
				onImageFileSelect,
			})
		);

		const file = new File(['abc'], 'documento.pdf', {
			type: 'application/pdf',
		});
		const event = {
			target: { files: [file] },
		} as unknown as React.ChangeEvent<HTMLInputElement>;

		act(() => {
			result.current.handleFileSelect(event);
		});

		expect(onImageFileSelect).not.toHaveBeenCalled();
		expect(validateFileForUpload).toHaveBeenCalledWith(file, expect.anything(), expect.anything());
		expect(result.current.isUploadDialogOpen).toBe(true);
		expect(result.current.selectedFile).toBe(file);
	});

	it('does nothing when no file is selected', () => {
		const onImageFileSelect = jest.fn();

		const { result } = renderHook(() =>
			useFileUpload({
				clientId: 1,
				onImageFileSelect,
			})
		);

		const event = {
			target: { files: [] },
		} as unknown as React.ChangeEvent<HTMLInputElement>;

		act(() => {
			result.current.handleFileSelect(event);
		});

		expect(onImageFileSelect).not.toHaveBeenCalled();
		expect(validateFileForUpload).not.toHaveBeenCalled();
		expect(result.current.isUploadDialogOpen).toBe(false);
	});
});
