import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '@/hooks/use-file-upload';

describe('useFileUpload', () => {
	it('abre el diálogo de subida para un archivo seleccionado', () => {
		const { result } = renderHook(() => useFileUpload({ clientId: 1 }));
		const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' });

		act(() => {
			result.current.openUploadDialogForFile(file);
		});

		expect(result.current.isUploadDialogOpen).toBe(true);
		expect(result.current.selectedFile).toBe(file);
		expect(result.current.displayName).toBe('foto');
	});
});
