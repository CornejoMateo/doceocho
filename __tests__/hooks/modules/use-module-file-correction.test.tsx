import { renderHook, act } from '@testing-library/react';
import { useModuleFileCorrection } from '@/hooks/modules/use-module-file-correction';
import { uploadModuleFile, updateModuleFile, deleteModuleFile } from '@/lib/modules/modules-files';
import {
	resubmitModuleFileAction,
	syncModuleStatusAction,
} from '@/lib/modules/modules-files-resubmit';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/modules/modules-files', () => ({
	uploadModuleFile: jest.fn(),
	updateModuleFile: jest.fn(),
	deleteModuleFile: jest.fn(),
	listModuleFiles: jest.fn(),
}));

jest.mock('@/lib/modules/modules-files-resubmit', () => ({
	resubmitModuleFileAction: jest.fn(),
	syncModuleStatusAction: jest.fn(),
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
} as any;

const replacementFile = () => new File(['x'], 'nuevo.jpg', { type: 'image/jpeg' });

describe('useModuleFileCorrection', () => {
	const patchFile = jest.fn();
	const reload = jest.fn();
	const onReviewed = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	const setup = () =>
		renderHook(() =>
			useModuleFileCorrection({
				open: true,
				moduleId,
				patchFile,
				reload,
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
		expect(reload).not.toHaveBeenCalled();
		expect(onReviewed).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Archivo corregido' }));
	});

	it('replaces the file: uploads the new one, deletes the old one, syncs the status and notifies the parent', async () => {
		(uploadModuleFile as jest.Mock).mockResolvedValue({ data: { id: 99 }, error: null });
		(deleteModuleFile as jest.Mock).mockResolvedValue({ success: true, error: null });
		(syncModuleStatusAction as jest.Mock).mockResolvedValue({ success: true, warning: null });
		const { result } = setup();

		act(() => {
			result.current.startFileCorrection(fileFixture);
			result.current.setCorrectionFile(replacementFile());
		});
		await act(async () => {
			await result.current.saveFileCorrection(fileFixture);
		});

		expect(uploadModuleFile).toHaveBeenCalledWith(3, expect.any(File), 'v1', 'foto.jpg');
		expect(deleteModuleFile).toHaveBeenCalledWith(5);
		expect(syncModuleStatusAction).toHaveBeenCalledWith(3);
		expect(reload).toHaveBeenCalled();
		expect(onReviewed).toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Archivo corregido' }));
	});

	it('rolls back the newly uploaded file when the original cannot be deleted', async () => {
		(uploadModuleFile as jest.Mock).mockResolvedValue({ data: { id: 99 }, error: null });
		(deleteModuleFile as jest.Mock).mockResolvedValue({ success: false, error: 'no-delete' });
		const { result } = setup();

		act(() => {
			result.current.startFileCorrection(fileFixture);
			result.current.setCorrectionFile(replacementFile());
		});
		await act(async () => {
			await result.current.saveFileCorrection(fileFixture);
		});

		// First attempt on the original file (fails) + rollback of the replacement just uploaded.
		expect(deleteModuleFile).toHaveBeenNthCalledWith(1, 5);
		expect(deleteModuleFile).toHaveBeenNthCalledWith(2, 99);
		expect(reload).not.toHaveBeenCalled();
		expect(onReviewed).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ variant: 'destructive', title: 'Error al reemplazar el archivo' })
		);
	});

	it('resubmits a corrected file to review and notifies the parent', async () => {
		(resubmitModuleFileAction as jest.Mock).mockResolvedValue({ success: true, warning: null });
		const { result } = setup();

		await act(async () => {
			await result.current.resubmitFile(fileFixture);
		});

		expect(resubmitModuleFileAction).toHaveBeenCalledWith(5);
		expect(reload).toHaveBeenCalled();
		expect(onReviewed).toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'Archivo reenviado a revisión' })
		);
	});

	it('does not reload or notify when the resubmit fails', async () => {
		(resubmitModuleFileAction as jest.Mock).mockResolvedValue({ success: false, error: 'nope' });
		const { result } = setup();

		await act(async () => {
			await result.current.resubmitFile(fileFixture);
		});

		expect(reload).not.toHaveBeenCalled();
		expect(onReviewed).not.toHaveBeenCalled();
		expect(toast).toHaveBeenCalledWith(
			expect.objectContaining({ variant: 'destructive', title: 'Error al reenviar el archivo' })
		);
	});
});
