import { renderHook, act, waitFor } from '@testing-library/react';

jest.mock('@/lib/works/works', () => ({
	listWorks: jest.fn(),
	updateWork: jest.fn(),
	getWorksByClientId: jest.fn(),
	createWork: jest.fn(),
	deleteWork: jest.fn(),
	getWorkById: jest.fn(),
	getWorksInProgressCount: jest.fn(),
	updateWorkGeneralNote: jest.fn(),
}));

jest.mock('@/lib/checklists/checklists', () => ({
	getChecklistsByWorkId: jest.fn(),
	getChecklistsByWorkIds: jest.fn(),
	getItemsByChecklistIds: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

import { useWorksWithProgress } from '@/hooks/clients/use-works-with-progress';

const mockWork = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	locality: 'Bs As',
	address: 'Calle 123',
	client_name: 'Cliente1',
	client_last_name: 'Apellido',
	status: 'pending',
	general_note: null,
	...overrides,
});

let worksMock: { listWorks: jest.Mock; updateWork: jest.Mock };
let checklistsMock: { getChecklistsByWorkIds: jest.Mock; getItemsByChecklistIds: jest.Mock };

beforeAll(() => {
	worksMock = jest.requireMock('@/lib/works/works') as never;
	checklistsMock = jest.requireMock('@/lib/checklists/checklists') as never;
});

describe('useWorksWithProgress', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		worksMock.listWorks.mockResolvedValue({ data: [], error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({ data: [], error: null });
		checklistsMock.getItemsByChecklistIds.mockResolvedValue({ data: [], error: null });
		worksMock.updateWork.mockResolvedValue({ error: null });
	});

	it('starts with empty works and loading', () => {
		const { result } = renderHook(() => useWorksWithProgress());
		expect(result.current.works).toEqual([]);
		expect(result.current.loading).toBe(true);
	});

	it('loads works and checklists and enriches with progress', async () => {
		const works = [mockWork()];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({
			data: [
				{
					id: 1,
					work_id: 1,
					notes: null,
				},
			],
			error: null,
		});
		checklistsMock.getItemsByChecklistIds.mockResolvedValue({
			data: [
				{ checklist_id: 1, description: 'Task 1', done: true },
				{ checklist_id: 1, description: 'Task 2', done: false },
			],
			error: null,
		});
		worksMock.updateWork.mockResolvedValue({ error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works).toHaveLength(1);
		expect(result.current.works[0].progress).toBe(50);
		expect(result.current.works[0].tasks).toHaveLength(2);
		expect(result.current.works[0].hasNotes).toBe(false);
	});

	it('handles empty works response', async () => {
		worksMock.listWorks.mockResolvedValue({ data: [], error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works).toEqual([]);
	});

	it('calculates 100% progress when all tasks done', async () => {
		const works = [mockWork()];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({
			data: [
				{
					id: 1,
					work_id: 1,
					notes: null,
				},
			],
			error: null,
		});
		checklistsMock.getItemsByChecklistIds.mockResolvedValue({
			data: [{ checklist_id: 1, description: 'Task 1', done: true }],
			error: null,
		});
		worksMock.updateWork.mockResolvedValue({ error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works[0].progress).toBe(100);
	});

	it('sets progress to 100 when no checklists exist', async () => {
		const works = [mockWork()];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({ data: [], error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works[0].progress).toBe(100);
	});

	it('updates status to completed when progress is 100 and no notes', async () => {
		const works = [mockWork({ status: 'pending' })];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({
			data: [
				{
					id: 1,
					work_id: 1,
					notes: null,
				},
			],
			error: null,
		});
		checklistsMock.getItemsByChecklistIds.mockResolvedValue({
			data: [{ checklist_id: 1, description: 'Task 1', done: true }],
			error: null,
		});
		worksMock.updateWork.mockResolvedValue({ error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works[0].status).toBe('completed');
		expect(worksMock.updateWork).toHaveBeenCalledWith(1, { status: 'completed' });
	});

	it('updates status to in_progress when progress > 0 and < 100', async () => {
		const works = [mockWork({ status: 'pending' })];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({
			data: [
				{
					id: 1,
					work_id: 1,
					notes: null,
				},
			],
			error: null,
		});
		checklistsMock.getItemsByChecklistIds.mockResolvedValue({
			data: [
				{ checklist_id: 1, description: 'Task 1', done: true },
				{ checklist_id: 1, description: 'Task 2', done: false },
			],
			error: null,
		});
		worksMock.updateWork.mockResolvedValue({ error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works[0].status).toBe('in_progress');
		expect(worksMock.updateWork).toHaveBeenCalledWith(1, { status: 'in_progress' });
	});

	it('keeps completed status as in_progress when has notes', async () => {
		const works = [mockWork({ status: 'completed', general_note: null })];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({
			data: [
				{
					id: 1,
					work_id: 1,
					notes: 'Some notes',
				},
			],
			error: null,
		});
		checklistsMock.getItemsByChecklistIds.mockResolvedValue({
			data: [{ checklist_id: 1, description: 'Task 1', done: true }],
			error: null,
		});
		worksMock.updateWork.mockResolvedValue({ error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works[0].status).toBe('in_progress');
		expect(result.current.works[0].hasNotes).toBe(true);
		expect(worksMock.updateWork).toHaveBeenCalledWith(1, { status: 'in_progress' });
	});

	it('sets hasNotes from checklist notes', async () => {
		const works = [mockWork()];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({
			data: [
				{
					id: 1,
					work_id: 1,
					notes: '  notes  ',
				},
			],
			error: null,
		});

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works[0].hasNotes).toBe(true);
	});

	it('does not auto-update status when already correct', async () => {
		const works = [mockWork({ status: 'pending' })];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({ data: [], error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(worksMock.updateWork).not.toHaveBeenCalled();
	});

	it('handles empty checklists gracefully', async () => {
		const works = [mockWork()];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({ data: [], error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));

		expect(result.current.works[0].tasks).toEqual([]);
		expect(result.current.works[0].progress).toBe(100);
	});

	it('reloads works when reload is called', async () => {
		const works = [mockWork()];
		worksMock.listWorks.mockResolvedValue({ data: works, error: null });
		checklistsMock.getChecklistsByWorkIds.mockResolvedValue({ data: [], error: null });

		const { result } = renderHook(() => useWorksWithProgress());

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.works).toHaveLength(1);

		worksMock.listWorks.mockResolvedValue({ data: [], error: null });

		await act(async () => {
			await result.current.reload();
		});

		expect(result.current.works).toHaveLength(0);
	});
});
