import { renderHook, act } from '@testing-library/react';
import { useModuleFileCorrection } from '@/hooks/modules/use-module-file-correction';
import { updateModuleFile, replaceModuleFileContent } from '@/lib/modules/modules-files';
import { resubmitAllRejectedFilesAction } from '@/lib/modules/modules-files-resubmit';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/modules/modules-files', () => ({
	updateModuleFile: jest.fn(),
	replaceModuleFileContent: jest.fn(),
	listModuleFiles: jest.fn(),
}));

jest.mock('@/lib/modules/modules-files-resubmit', () => ({
	resubmitAllRejectedFilesAction: jest.fn(),
}));

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Unknown error',
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

const moduleId = 3;

const fileFixture = {
	id: 5,
	module_id: 3,
	storage_path: 'a.jpg',
	file_name: 'foto.jpg',
	description: 'v1',
	status: 'rejected',
} as any;

const replacementFile = () => new File(['x'], 'nuevo.jpg', { type: 'image/jpeg' });

describe('useModuleFileCorrection', () => {
	const patchFile = jest.fn();
	const replaceFile = jest.fn().mockResolvedValue(undefined);
	const onReviewed = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		replaceFile.mockResolvedValue(undefined);
	});

	const setup = (files: any[] = [fileFixture]) =>
		renderHook(() =>
			useModuleFileCorrection({
				open: true,
				moduleId,
				files,
				patchFile,
				replaceFile,
				onReviewed,
			})
		);

	it('edits only the description without reloading files or notifying the parent', async () => {
		(updateModuleFile as jest.Mock).mockResolvedValue({ error: null });
		const { result } = setup();

		act(() => {
			result.current.startFileCorrection(fileFixture);
			result.current.setCorrectionDescription('New description');
		});
		await act(async () => {
			await result.current.saveFileCorrection(fileFixture);
		});

		expect(updateModuleFile).toHaveBeenCalledWith(5, { description: 'New description' });
		expect(patchFile).toHaveBeenCalledWith(5, { description: 'New description' });
		expect(replaceFile).not.toHaveBeenCalled();
		expect(onReviewed).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Archivo corregido' }));
	});

	it('replaces the file content in place (same id, upload-then-update), resets status to null (was rejected), and notifies the parent', async () => {
		(replaceModuleFileContent as jest.Mock).mockResolvedValue({
			data: { id: 5, storage_path: 'new-path.jpg', status: null },
			error: null,
		});
		const { result } = setup();

		act(() => {
			result.current.startFileCorrection(fileFixture);
			result.current.setCorrectionFile(replacementFile());
		});
		await act(async () => {
			await result.current.saveFileCorrection(fileFixture);
		});

		expect(replaceModuleFileContent).toHaveBeenCalledWith(5, 3, expect.any(File), 'foto.jpg', 'v1');
		expect(replaceFile).toHaveBeenCalledWith(5, {
			id: 5,
			storage_path: 'new-path.jpg',
			status: null,
		});
		expect(onReviewed).toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Archivo corregido' }));
	});

	it('shows an error and does not touch local state when the in-place replacement fails', async () => {
		(replaceModuleFileContent as jest.Mock).mockResolvedValue({
			data: null,
			error: 'no-update',
		});
		const { result } = setup();

		act(() => {
			result.current.startFileCorrection(fileFixture);
			result.current.setCorrectionFile(replacementFile());
		});
		await act(async () => {
			await result.current.saveFileCorrection(fileFixture);
		});

		expect(replaceModuleFileContent).toHaveBeenCalledWith(5, 3, expect.any(File), 'foto.jpg', 'v1');
		expect(replaceFile).not.toHaveBeenCalled();
		expect(onReviewed).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ variant: 'destructive', title: 'Error al reemplazar el archivo' })
		);
	});

	it('resubmits all rejected files for the module via local patch, without a full reload', async () => {
		(resubmitAllRejectedFilesAction as jest.Mock).mockResolvedValue({
			success: true,
			warning: null,
		});
		const { result } = setup([
			fileFixture,
			{ id: 6, module_id: 3, storage_path: 'b.jpg', status: 'rejected' },
			{ id: 7, module_id: 3, storage_path: 'c.jpg', status: 'approved' },
		]);

		await act(async () => {
			await result.current.resubmitAllRejectedFiles();
		});

		expect(resubmitAllRejectedFilesAction).toHaveBeenCalledWith(3);
		expect(patchFile).toHaveBeenCalledWith(5, { status: null });
		expect(patchFile).toHaveBeenCalledWith(6, { status: null });
		expect(patchFile).not.toHaveBeenCalledWith(7, expect.anything());
		expect(replaceFile).not.toHaveBeenCalled();
		expect(onReviewed).toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Revisión solicitada' }));
	});

	it('does not patch files or notify when the module-wide resubmit fails', async () => {
		(resubmitAllRejectedFilesAction as jest.Mock).mockResolvedValue({
			success: false,
			error: 'nope',
		});
		const { result } = setup();

		await act(async () => {
			await result.current.resubmitAllRejectedFiles();
		});

		expect(patchFile).not.toHaveBeenCalled();
		expect(replaceFile).not.toHaveBeenCalled();
		expect(onReviewed).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ variant: 'destructive', title: 'Error al solicitar la revisión' })
		);
	});
});
