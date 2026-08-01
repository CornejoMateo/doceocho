import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '@/hooks/clients/use-notifications';
import { getClientById } from '@/lib/clients/clients';

jest.mock('@/lib/clients/clients', () => ({
	getClientById: jest.fn(),
}));

const mockGetClientById = jest.mocked(getClientById);

const baseWork = {
	id: 10,
	locality: 'Córdoba',
	address: 'Av. Paz 123',
	client_id: 1,
	client_name: 'Juan',
	client_last_name: 'Pérez',
	status: 'in_progress' as const,
	progress: 50,
	hasNotes: false,
	general_note: null,
	tasks: [],
};

const baseClient = {
	id: 1,
	name: 'Juan',
	last_name: 'Pérez',
	email: 'juan@test.com',
};

describe('useNotifications', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as any) = undefined;
	});

	describe('openEmail / prepareNotification', () => {
		it('prepares notification with client data', async () => {
			mockGetClientById.mockResolvedValue({ data: baseClient, error: null });

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.openEmail(baseWork as any);
			});

			expect(mockGetClientById).toHaveBeenCalledWith(1);
			expect(result.current.selectedClient).toEqual(baseClient);
			expect(result.current.selectedWork).toEqual(baseWork);
			expect(result.current.activeModal).toBe('email');
		});

		it('does not prepare when work has no client_id', async () => {
			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.openEmail({ ...baseWork, client_id: null } as any);
			});

			expect(mockGetClientById).not.toHaveBeenCalled();
			expect(result.current.activeModal).toBeNull();
		});

		it('handles error when fetching client', async () => {
			mockGetClientById.mockResolvedValue({ data: null, error: { message: 'Not found' } });
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.openEmail(baseWork as any);
			});

			expect(result.current.activeModal).toBeNull();
			consoleSpy.mockRestore();
		});
	});

	describe('sendEmail', () => {
		it('sends email via fetch to /api/send-email', async () => {
			mockGetClientById.mockResolvedValue({ data: baseClient, error: null });
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true }),
			});

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.openEmail(baseWork as any);
			});

			const emailData = {
				clientId: 1,
				workId: 10,
				to: 'juan@test.com',
				subject: 'Test',
				message: 'Hola',
			};

			await act(async () => {
				await result.current.sendEmail(emailData);
			});

			expect(global.fetch).toHaveBeenCalledWith('/api/send-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(emailData),
			});
		});

		it('closes modal after sending', async () => {
			mockGetClientById.mockResolvedValue({ data: baseClient, error: null });
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true }),
			});

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.openEmail(baseWork as any);
			});

			expect(result.current.activeModal).toBe('email');

			await act(async () => {
				await result.current.sendEmail({
					clientId: 1,
					workId: 10,
					to: 'juan@test.com',
					subject: 'Test',
					message: 'Hola',
				});
			});

			expect(result.current.activeModal).toBeNull();
			expect(result.current.selectedClient).toBeNull();
			expect(result.current.selectedWork).toBeNull();
		});

		it('throws error when fetch fails', async () => {
			mockGetClientById.mockResolvedValue({ data: baseClient, error: null });
			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ success: false, error: 'SMTP error' }),
			});

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.openEmail(baseWork as any);
			});

			await expect(
				act(async () => {
					await result.current.sendEmail({
						clientId: 1,
						workId: 10,
						to: 'juan@test.com',
						subject: 'Test',
						message: 'Hola',
					});
				})
			).rejects.toThrow('SMTP error');
		});
	});

	describe('closeModal', () => {
		it('resets all state', async () => {
			mockGetClientById.mockResolvedValue({ data: baseClient, error: null });

			const { result } = renderHook(() => useNotifications());

			await act(async () => {
				await result.current.openEmail(baseWork as any);
			});

			expect(result.current.activeModal).toBe('email');

			act(() => {
				result.current.closeModal();
			});

			expect(result.current.activeModal).toBeNull();
			expect(result.current.selectedClient).toBeNull();
			expect(result.current.selectedWork).toBeNull();
		});
	});
});
