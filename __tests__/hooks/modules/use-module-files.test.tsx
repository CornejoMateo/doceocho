import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useModuleFiles } from '@/hooks/modules/use-module-files';

import { listModuleFiles } from '@/lib/modules/modules-files';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/modules/modules-files', () => ({
	listModuleFiles: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error desconocido',
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/utils/file-upload-utils', () => {
	const actual = jest.requireActual('@/utils/file-upload-utils');
	return {
		...actual,
		isImage: jest.fn((mime: string) => mime.startsWith('image/')),
		isValidFileSize: jest.fn((file: any, max: number) => file.size <= max),
	};
});

jest.mock('@/components/business/modules/inputs-form-module', () => ({
	PendingFile: undefined,
}));

describe('useModuleFiles', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		URL.createObjectURL = jest.fn(() => 'blob:mock') as any;
		URL.revokeObjectURL = jest.fn() as any;
	});

	const makeFile = (name: string, type: string, size = 100) =>
		new File([new ArrayBuffer(size)], name, { type });

	const imgFile = () => makeFile('foto.jpg', 'image/jpeg');
	const bigImgFile = () => makeFile('foto.jpg', 'image/jpeg', 11 * 1024 * 1024);
	const bigVideoFile = () => makeFile('video.mp4', 'video/mp4', 51 * 1024 * 1024);
	const pdfFile = () => makeFile('doc.pdf', 'application/pdf');

	it('adds a valid image file', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([imgFile()]);
		});
		expect(result.current.files).toHaveLength(1);
		expect(result.current.files[0].isImage).toBe(true);
		expect(result.current.files[0].displayName).toBe('foto');
		expect(toast).not.toHaveBeenCalled();
	});

	it('rejects an image larger than 10MB and shows a toast', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([bigImgFile()]);
		});
		expect(result.current.files).toHaveLength(0);
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				variant: 'destructive',
				title: 'Archivo(s) no agregados',
				description: expect.stringContaining('10MB'),
			})
		);
	});

	it('rejects a video larger than 50MB and shows a toast', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([bigVideoFile()]);
		});
		expect(result.current.files).toHaveLength(0);
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				description: expect.stringContaining('50MB'),
			})
		);
	});

	it('allows oversize files when allowOversize is set (recorded video)', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([bigVideoFile()], { allowOversize: true });
		});
		expect(result.current.files).toHaveLength(1);
		expect(toast).not.toHaveBeenCalled();
	});

	it('ignores files that are neither images nor videos', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([pdfFile()]);
		});
		expect(result.current.files).toHaveLength(0);
		expect(toast).not.toHaveBeenCalled();
	});

	it('removes a file and revokes its preview URL', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([imgFile()]);
		});
		const id = result.current.files[0].id;
		expect(URL.createObjectURL).toHaveBeenCalled();
		act(() => {
			result.current.removeFile(id);
		});
		expect(result.current.files).toHaveLength(0);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
	});

	it('removes all files', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([imgFile(), makeFile('v.mp4', 'video/mp4')]);
		});
		expect(result.current.files).toHaveLength(2);
		act(() => {
			result.current.removeAllFiles();
		});
		expect(result.current.files).toHaveLength(0);
	});

	it('updates displayName and description of a file', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([imgFile()]);
		});
		const id = result.current.files[0].id;
		act(() => {
			result.current.updateFileField(id, 'displayName', 'Nuevo nombre');
			result.current.updateFileField(id, 'description', 'Descripción');
		});
		expect(result.current.files[0].displayName).toBe('Nuevo nombre');
		expect(result.current.files[0].description).toBe('Descripción');
	});

	it('adds a file via handleImageReady when not editing', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		let ok = false;
		act(() => {
			ok = result.current.handleImageReady(imgFile());
		});
		expect(ok).toBe(true);
		expect(result.current.files).toHaveLength(1);
		expect(result.current.files[0].isImage).toBe(true);
	});

	it('replaces the edited file via handleImageReady when editing', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		act(() => {
			result.current.addFiles([imgFile()]);
		});
		const id = result.current.files[0].id;
		act(() => {
			result.current.openEditorForEdit(id, result.current.files[0].file!);
		});
		const replacement = makeFile('nueva.jpg', 'image/jpeg');
		act(() => {
			result.current.handleImageReady(replacement);
		});
		expect(result.current.files).toHaveLength(1);
		expect(result.current.files[0].file).toBe(replacement);
		expect(result.current.files[0].preview).toBe('blob:mock');
	});

	it('opens and closes the image editor', () => {
		const { result } = renderHook(() => useModuleFiles({}));
		expect(result.current.editorOpen).toBe(false);
		act(() => {
			result.current.openEditorForNew();
		});
		expect(result.current.editorOpen).toBe(true);
		act(() => {
			result.current.closeEditor();
		});
		expect(result.current.editorOpen).toBe(false);
	});

	it('shows a destructive toast when getUserMedia fails', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				getUserMedia: jest.fn().mockRejectedValue(new Error('Permiso denegado')),
			},
			configurable: true,
		});

		const { result } = renderHook(() => useModuleFiles({}));
		await act(async () => {
			await result.current.toggleRecording();
		});
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({
				variant: 'destructive',
				title: 'No se pudo grabar video',
			})
		);
		expect(result.current.isRecording).toBe(false);
	});

	it('does not load existing files when there is no module to edit', async () => {
		const { result } = renderHook(() => useModuleFiles({}));
		await act(async () => {});
		expect(listModuleFiles).not.toHaveBeenCalled();
		expect(result.current.files).toHaveLength(0);
	});
});
