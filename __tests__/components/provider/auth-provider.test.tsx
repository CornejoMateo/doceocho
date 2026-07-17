import { renderHook, act, waitFor } from '@testing-library/react';

import { AuthProvider, useAuth } from '@/components/provider/auth-provider';
import { getSupabaseClient } from '@/lib/supabase-client';
import { UI } from 'react-day-picker';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

const mockRouter = {
	push: jest.fn(),
	refresh: jest.fn(),
};

jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter,
}));

jest.mock('next/server', () => ({
	after: jest.fn(),
	NextResponse: { json: jest.fn() },
}));

const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();
const mockUnsubscribe = jest.fn();

function setupSupabase() {
	mockOnAuthStateChange.mockReturnValue({
		data: { subscription: { unsubscribe: mockUnsubscribe } },
	});

	mockSignInWithPassword.mockResolvedValue({ error: null });
	mockSignOut.mockResolvedValue(undefined);
	mockGetSession.mockResolvedValue({ data: { session: null } });
	mockGetUser.mockResolvedValue({ data: { user: null } });

	(getSupabaseClient as jest.Mock).mockReturnValue({
		auth: {
			onAuthStateChange: mockOnAuthStateChange,
			signInWithPassword: mockSignInWithPassword,
			signOut: mockSignOut,
			getSession: mockGetSession,
			getUser: mockGetUser,
		},
	});
}

beforeEach(() => {
	jest.clearAllMocks();
	setupSupabase();
	global.fetch = jest.fn();
});

describe('AuthProvider', () => {
	it('starts with loading true and user null', () => {
		const { result } = renderHook(() => useAuth(), {
			wrapper: AuthProvider,
		});

		expect(result.current.loading).toBe(true);
		expect(result.current.user).toBeNull();
	});

	it('subscribes to auth state changes on mount', () => {
		renderHook(() => useAuth(), { wrapper: AuthProvider });

		expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
	});

	it('sets user to null when session is null on auth state change', async () => {
		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

		const authCallback = mockOnAuthStateChange.mock.calls[0][0];

		await act(async () => {
			await authCallback('SIGNED_OUT', null);
		});

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.user).toBeNull();
	});

	it('fetches profile and sets user on SIGNED_IN', async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				data: {
					username: 'admin',
					role: 'Admin',
					name: 'Admin',
					last_name: 'User',
					uid_user: '12345',
				},
			}),
		});

		mockGetSession.mockResolvedValueOnce({
			data: { session: { access_token: 'test-token', user: { email: 'admin@test.com' } } },
		});

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

		const authCallback = mockOnAuthStateChange.mock.calls[0][0];

		await act(async () => {
			await authCallback('SIGNED_IN', {
				access_token: 'test-token',
				user: { email: 'admin@test.com' },
			});
		});

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.user).toEqual({
			username: 'admin',
			role: 'Admin',
			name: 'Admin',
			last_name: 'User',
			uid: '12345',
		});

		expect(global.fetch).toHaveBeenCalledWith('/api/me', {
			headers: { Authorization: 'Bearer test-token' },
		});
	});

	it('sets user to null when fetchProfile returns null', async () => {
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			json: async () => ({ data: null }),
		});

		mockGetSession.mockResolvedValueOnce({
			data: { session: { access_token: 'bad-token', user: { email: 'test@test.com' } } },
		});

		const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

		const authCallback = mockOnAuthStateChange.mock.calls[0][0];

		await act(async () => {
			await authCallback('SIGNED_IN', {
				access_token: 'bad-token',
				user: { email: 'test@test.com' },
			});
		});

		await waitFor(() => {
			expect(result.current.loading).toBe(false);
		});

		expect(result.current.user).toBeNull();
	});

	it('unsubscribes on unmount', () => {
		const { unmount } = renderHook(() => useAuth(), { wrapper: AuthProvider });

		unmount();

		expect(mockUnsubscribe).toHaveBeenCalled();
	});

	describe('signIn', () => {
		it('calls /api/login and supabase signInWithPassword on success', async () => {
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: {
						username: 'juan',
						mail: 'juan@test.com',
						role: 'Taller',
						name: 'Juan',
						last_name: 'Pérez',
						uid_user: 'user-123',
					},
				}),
			});

			mockGetSession.mockResolvedValue({
				data: { session: { access_token: 'new-token', user: { email: 'juan@test.com' } } },
			});

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: {
						username: 'juan',
						role: 'Taller',
						name: 'Juan',
						last_name: 'Pérez',
						uid_user: 'user-123',
					},
				}),
			});

			const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

			let sessionUser;
			await act(async () => {
				sessionUser = await result.current.signIn('juan', 'password123');
			});

			expect(global.fetch).toHaveBeenCalledWith('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: 'juan' }),
			});

			expect(mockSignInWithPassword).toHaveBeenCalledWith({
				email: 'juan@test.com',
				password: 'password123',
			});

			expect(result.current.user).toEqual({
				username: 'juan',
				role: 'Taller',
				name: 'Juan',
				last_name: 'Pérez',
				uid: 'user-123',
			});

			expect(sessionUser).toEqual({
				username: 'juan',
				role: 'Taller',
				name: 'Juan',
				last_name: 'Pérez',
				uid: 'user-123',
			});

			expect(result.current.loading).toBe(false);
		});

		it('throws on API error', async () => {
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: 'Usuario no encontrado' }),
			});

			const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

			await act(async () => {
				await expect(result.current.signIn('wrong', 'pass')).rejects.toThrow(
					'Usuario no encontrado'
				);
			});
		});

		it('throws on supabase signInWithPassword error', async () => {
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: {
						username: 'juan',
						mail: 'juan@test.com',
						role: 'Taller',
					},
				}),
			});

			mockSignInWithPassword.mockResolvedValueOnce({
				error: new Error('Invalid password'),
			});

			const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

			await act(async () => {
				await expect(result.current.signIn('juan', 'wrong')).rejects.toThrow(
					'Usuario o contraseña incorrectos'
				);
			});
		});

		it('throws when API returns no data', async () => {
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: null }),
			});

			const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

			await act(async () => {
				await expect(result.current.signIn('juan', 'pass')).rejects.toThrow(
					'Usuario o contraseña incorrectos'
				);
			});
		});
	});

	describe('signOutUser', () => {
		it('signs out, clears user, and redirects to login', async () => {
			mockGetSession.mockResolvedValueOnce({
				data: { session: { access_token: 'tok', user: { email: 'a@b.com' } } },
			});

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: { username: 'admin', role: 'Admin', name: 'A', last_name: 'B' },
				}),
			});

			const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

			const authCallback = mockOnAuthStateChange.mock.calls[0][0];
			await act(async () => {
				await authCallback('SIGNED_IN', { access_token: 'tok', user: { email: 'a@b.com' } });
			});

			await waitFor(() => {
				expect(result.current.user).not.toBeNull();
			});

			await act(async () => {
				await result.current.signOutUser();
			});

			expect(mockSignOut).toHaveBeenCalled();
			expect(result.current.user).toBeNull();
			expect(mockRouter.push).toHaveBeenCalledWith('/login');
			expect(mockRouter.refresh).toHaveBeenCalled();
			expect(result.current.loading).toBe(false);
		});
	});

	describe('session persistence', () => {
		it('keeps user alive on TOKEN_REFRESHED', async () => {
			mockGetSession.mockResolvedValueOnce({
				data: { session: { access_token: 'initial-token', user: { email: 'a@b.com' } } },
			});

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: { username: 'admin', role: 'Admin', name: 'A', last_name: 'B', uid_user: '123' },
				}),
			});

			const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
			const authCallback = mockOnAuthStateChange.mock.calls[0][0];

			await act(async () => {
				await authCallback('SIGNED_IN', {
					access_token: 'initial-token',
					user: { email: 'a@b.com' },
				});
			});

			await waitFor(() => {
				expect(result.current.user).not.toBeNull();
			});

			const userAfterSignIn = result.current.user;

			mockGetSession.mockResolvedValueOnce({
				data: { session: { access_token: 'refreshed-token', user: { email: 'a@b.com' } } },
			});

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: { username: 'admin', role: 'Admin', name: 'A', last_name: 'B', uid_user: '123' },
				}),
			});

			await act(async () => {
				await authCallback('TOKEN_REFRESHED', {
					access_token: 'refreshed-token',
					user: { email: 'a@b.com' },
				});
			});

			expect(result.current.user).not.toBeNull();
			expect(result.current.user?.username).toBe(userAfterSignIn?.username);
			expect(result.current.user?.uid).toBe(userAfterSignIn?.uid);
		});

		it('keeps user alive on TOKEN_REFRESHED even if fetchProfile fails', async () => {
			mockGetSession.mockResolvedValueOnce({
				data: { session: { access_token: 'initial-token', user: { email: 'a@b.com' } } },
			});

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: { username: 'admin', role: 'Admin', name: 'A', last_name: 'B', uid_user: '123' },
				}),
			});

			const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
			const authCallback = mockOnAuthStateChange.mock.calls[0][0];

			await act(async () => {
				await authCallback('SIGNED_IN', {
					access_token: 'initial-token',
					user: { email: 'a@b.com' },
				});
			});

			await waitFor(() => {
				expect(result.current.user).not.toBeNull();
			});

			mockGetSession.mockResolvedValueOnce({
				data: { session: { access_token: 'refreshed-token', user: { email: 'a@b.com' } } },
			});

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: 'Server error' }),
			});

			await act(async () => {
				await authCallback('TOKEN_REFRESHED', {
					access_token: 'refreshed-token',
					user: { email: 'a@b.com' },
				});
			});

			expect(result.current.user).not.toBeNull();
			expect(result.current.user?.username).toBe('admin');
		});

		it('user is cleared only on SIGNED_OUT, not on TOKEN_REFRESHED with null session', async () => {
			mockGetSession.mockResolvedValueOnce({
				data: { session: { access_token: 'initial-token', user: { email: 'a@b.com' } } },
			});

			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					data: { username: 'admin', role: 'Admin', name: 'A', last_name: 'B', uid_user: '123' },
				}),
			});

			const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
			const authCallback = mockOnAuthStateChange.mock.calls[0][0];

			await act(async () => {
				await authCallback('SIGNED_IN', {
					access_token: 'initial-token',
					user: { email: 'a@b.com' },
				});
			});

			await waitFor(() => {
				expect(result.current.user).not.toBeNull();
			});

			await act(async () => {
				await authCallback('SIGNED_OUT', null);
			});

			expect(result.current.user).toBeNull();
		});
	});

	describe('useAuth', () => {
		it('throws when used outside AuthProvider', () => {
			expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
		});
	});
});
