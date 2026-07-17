import {
	getUser,
	listUsers,
	createUser,
	deleteUser,
	updateUser,
	updateUserPassword,
} from '@/lib/users/users';
import { getSupabaseClient } from '@/lib/supabase-client';

jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: jest.fn(),
}));

function createSupabaseMock(session: any = { access_token: 'test-token' }) {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn(() => chain),
		order: jest.fn(() => chain),
		eq: jest.fn(() => chain),
		update: jest.fn(() => chain),
		delete: jest.fn(() => chain),
		maybeSingle: jest.fn(() => chain),
		single: jest.fn(() => chain),
	};

	const supabase = {
		from: jest.fn(() => chain),
		auth: {
			getSession: jest.fn().mockResolvedValue({ data: { session } }),
		},
	};

	return { supabase, chain };
}

describe('users lib', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(getSupabaseClient as jest.Mock).mockReturnValue({
			auth: {
				getSession: jest
					.fn()
					.mockResolvedValue({ data: { session: { access_token: 'test-token' } } }),
			},
			from: jest.fn(),
		});
	});

	describe('listUsers', () => {
		it('returns all users ordered by username', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: true,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({
					data: [
						{ uid_user: '1', username: 'admin', role: 'Admin' },
						{ uid_user: '2', username: 'taller', role: 'Taller' },
					],
				}),
			});

			const result = await listUsers();

			expect(global.fetch).toHaveBeenCalledWith(
				'/api/users',
				expect.objectContaining({
					headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
				})
			);
			expect(result.data).toHaveLength(2);
			expect(result.data?.[0].username).toBe('admin');
		});

		it('returns error on failure', async () => {
			global.fetch = jest.fn().mockResolvedValue({
				ok: false,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({ error: 'Error al listar usuarios' }),
			});

			const result = await listUsers();

			expect(result.error).toBe('Error al listar usuarios');
			expect(result.data).toBeNull();
		});
	});

	describe('createUser', () => {
		beforeEach(() => {
			global.fetch = jest.fn();
		});

		it('calls POST /api/users with correct payload', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({ success: true }),
			});

			const result = await createUser({
				username: 'nuevo',
				password: '123456',
				role: 'Taller',
				name: 'Juan',
				last_name: 'Pérez',
			});

			expect(global.fetch).toHaveBeenCalledWith('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
				body: JSON.stringify({
					username: 'nuevo',
					password: '123456',
					role: 'Taller',
					name: 'Juan',
					last_name: 'Pérez',
				}),
			});
			expect(result.error).toBeNull();
			expect(result.data).toEqual({ success: true });
		});

		it('returns error when API fails', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({ error: 'El usuario ya existe' }),
			});

			const result = await createUser({
				username: 'existente',
				password: '123456',
				role: 'Taller',
			});

			expect(result.error).toBe('El usuario ya existe');
			expect(result.data).toBeNull();
		});

		it('returns network error on fetch failure', async () => {
			(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

			const result = await createUser({
				username: 'test',
				password: '123456',
				role: 'Taller',
			});

			expect(result.error).toBe('Network error');
		});
	});

	describe('deleteUser', () => {
		beforeEach(() => {
			global.fetch = jest.fn();
		});

		it('calls DELETE /api/users with uid_user', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({ success: true }),
			});

			const result = await deleteUser('abc-123');

			expect(global.fetch).toHaveBeenCalledWith('/api/users', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
				body: JSON.stringify({ uid_user: 'abc-123' }),
			});
			expect(result.error).toBeNull();
		});

		it('returns error when API fails', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({ error: 'Usuario no encontrado' }),
			});

			const result = await deleteUser('abc-123');

			expect(result.error).toBe('Usuario no encontrado');
		});
	});

	describe('updateUser', () => {
		beforeEach(() => {
			global.fetch = jest.fn();
		});

		it('updates user role', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({
					data: { uid_user: '1', username: 'user1', role: 'Admin' },
				}),
			});

			const result = await updateUser('1', { role: 'Admin' });

			expect(global.fetch).toHaveBeenCalledWith('/api/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
				body: JSON.stringify({ uid_user: '1', role: 'Admin' }),
			});
			expect(result.data?.role).toBe('Admin');
		});

		it('updates username', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({
					data: { uid_user: '1', username: 'newuser', role: 'Taller' },
				}),
			});

			const result = await updateUser('1', { username: 'newuser' });

			expect(global.fetch).toHaveBeenCalledWith('/api/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
				body: JSON.stringify({ uid_user: '1', username: 'newuser' }),
			});
			expect(result.data?.username).toBe('newuser');
		});

		it('updates name and last_name', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({
					data: {
						uid_user: '1',
						username: 'user1',
						role: 'Taller',
						name: 'Juan',
						last_name: 'Pérez',
					},
				}),
			});

			const result = await updateUser('1', { name: 'Juan', last_name: 'Pérez' });

			expect(global.fetch).toHaveBeenCalledWith('/api/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
				body: JSON.stringify({ uid_user: '1', name: 'Juan', last_name: 'Pérez' }),
			});
			expect(result.data?.name).toBe('Juan');
			expect(result.data?.last_name).toBe('Pérez');
		});
	});

	describe('updateUserPassword', () => {
		beforeEach(() => {
			global.fetch = jest.fn();
		});

		it('calls PUT /api/users with uid_user and password', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: true,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({ success: true }),
			});

			const result = await updateUserPassword('abc-123', 'newpass');

			expect(global.fetch).toHaveBeenCalledWith('/api/users', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
				body: JSON.stringify({ uid_user: 'abc-123', password: 'newpass' }),
			});
			expect(result.error).toBeNull();
		});

		it('returns error when API fails', async () => {
			(global.fetch as jest.Mock).mockResolvedValue({
				ok: false,
				headers: new Map([['content-type', 'application/json']]),
				json: async () => ({ error: 'Error al actualizar' }),
			});

			const result = await updateUserPassword('abc-123', 'newpass');

			expect(result.error).toBe('Error al actualizar');
		});
	});

	describe('getUser', () => {
		it('returns user by username', async () => {
			const { supabase, chain } = createSupabaseMock();

			chain.maybeSingle = jest.fn().mockResolvedValue({
				data: { uid_user: '1', username: 'admin', role: 'Admin' },
				error: null,
			});

			(getSupabaseClient as jest.Mock).mockReturnValue(supabase);

			const result = await getUser('admin');

			expect(supabase.from).toHaveBeenCalledWith('users');
			expect(chain.select).toHaveBeenCalledWith('*');
			expect(chain.eq).toHaveBeenCalledWith('username', 'admin');
			expect(result.data?.username).toBe('admin');
		});
	});
});
