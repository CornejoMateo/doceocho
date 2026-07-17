/**
 * @jest-environment node
 */

import { POST, GET, PUT, DELETE } from '@/app/api/users/route';

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(),
}));

jest.mock('@/helpers/users/auth-admin', () => ({
	requireAdmin: jest.fn(),
}));

const requireAdmin = jest.mocked(require('@/helpers/users/auth-admin').requireAdmin);
const mockCreateClient = jest.mocked(require('@supabase/supabase-js').createClient);

function mockSupabase(overrides: Record<string, any> = {}) {
	const chain: Record<string, jest.Mock> = {
		select: jest.fn().mockReturnThis(),
		order: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		maybeSingle: jest.fn(),
		single: jest.fn(),
		insert: jest.fn(),
		update: jest.fn().mockReturnThis(),
		delete: jest.fn(),
		...overrides,
	};

	const admin = {
		createUser: jest.fn(),
		deleteUser: jest.fn(),
		updateUserById: jest.fn(),
	};

	mockCreateClient.mockReturnValue({
		auth: { admin },
		from: jest.fn(() => chain),
	});

	return { chain, admin };
}

describe('POST /api/users', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.url';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		requireAdmin.mockResolvedValue({ id: 'admin-uid' });
	});

	it('returns 401 when not authenticated', async () => {
		requireAdmin.mockRejectedValue(new Error('UNAUTHORIZED'));

		const req = new Request('http://localhost/api/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'test', password: '123456', role: 'Taller' }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toBe('No autenticado');
	});

	it('returns 403 when user is not admin', async () => {
		requireAdmin.mockRejectedValue(new Error('FORBIDDEN'));

		const req = new Request('http://localhost/api/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'test', password: '123456', role: 'Taller' }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(403);
		expect(body.error).toBe('No autorizado');
	});

	it('returns 400 when required fields are missing', async () => {
		const req = new Request('http://localhost/api/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'test' }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain('Faltan campos');
	});

	it('creates a user successfully', async () => {
		const { chain, admin } = mockSupabase();
		admin.createUser.mockResolvedValue({
			data: { user: { id: 'new-uid' } },
			error: null,
		});
		chain.insert.mockResolvedValue({ error: null });

		const req = new Request('http://localhost/api/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				username: 'nuevo',
				password: '123456',
				role: 'Taller',
				name: 'Juan',
				last_name: 'Pérez',
			}),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(admin.createUser).toHaveBeenCalledWith(
			expect.objectContaining({ email: 'nuevo@gmail.com', password: '123456' })
		);
		expect(chain.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				uid_user: 'new-uid',
				username: 'nuevo',
				role: 'Taller',
				name: 'Juan',
				last_name: 'Pérez',
			})
		);
	});

	it('rolls back auth user when DB insert fails', async () => {
		const { chain, admin } = mockSupabase();
		admin.createUser.mockResolvedValue({
			data: { user: { id: 'new-uid' } },
			error: null,
		});
		chain.insert.mockResolvedValue({ error: { message: 'DB error' } });
		admin.deleteUser.mockResolvedValue({ error: null });

		const req = new Request('http://localhost/api/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'nuevo', password: '123456', role: 'Taller' }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBe('DB error');
		expect(admin.deleteUser).toHaveBeenCalledWith('new-uid');
	});

	it('returns 400 when auth admin.createUser fails', async () => {
		const { admin } = mockSupabase();
		admin.createUser.mockResolvedValue({
			data: null,
			error: { message: 'User already exists' },
		});

		const req = new Request('http://localhost/api/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'existente', password: '123456', role: 'Admin' }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBe('User already exists');
	});
});

describe('GET /api/users', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.url';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		requireAdmin.mockResolvedValue({ id: 'admin-uid' });
	});

	it('returns 401 when not authenticated', async () => {
		requireAdmin.mockRejectedValue(new Error('UNAUTHORIZED'));

		const req = new Request('http://localhost/api/users');
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toBe('No autenticado');
	});

	it('lists all users ordered by username', async () => {
		const { chain } = mockSupabase();
		chain.order.mockResolvedValue({
			data: [
				{ uid_user: '1', username: 'admin', role: 'Admin' },
				{ uid_user: '2', username: 'taller', role: 'Taller' },
			],
			error: null,
		});

		const req = new Request('http://localhost/api/users');
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data).toHaveLength(2);
		expect(body.data[0].username).toBe('admin');
	});

	it('returns a single user by uid', async () => {
		const { chain } = mockSupabase();
		chain.maybeSingle.mockResolvedValue({
			data: { uid_user: 'abc', username: 'specific', role: 'Admin' },
			error: null,
		});

		const req = new Request('http://localhost/api/users?uid=abc');
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data.username).toBe('specific');
		expect(chain.eq).toHaveBeenCalledWith('uid_user', 'abc');
	});

	it('returns 500 on DB error', async () => {
		const { chain } = mockSupabase();
		chain.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });

		const req = new Request('http://localhost/api/users');
		const res = await GET(req);
		const body = await res.json();

		expect(res.status).toBe(500);
		expect(body.error).toBe('Error al listar usuarios');
	});
});

describe('PUT /api/users', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.url';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		requireAdmin.mockResolvedValue({ id: 'admin-uid' });
	});

	it('returns 401 when not authenticated', async () => {
		requireAdmin.mockRejectedValue(new Error('UNAUTHORIZED'));

		const req = new Request('http://localhost/api/users', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ uid_user: 'abc' }),
		});
		const res = await PUT(req);
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toBe('No autenticado');
	});

	it('returns 400 when uid_user is missing', async () => {
		const req = new Request('http://localhost/api/users', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role: 'Admin' }),
		});
		const res = await PUT(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBe('Falta uid_user');
	});

	it('updates user password', async () => {
		const { admin } = mockSupabase();
		admin.updateUserById.mockResolvedValue({ error: null });

		const req = new Request('http://localhost/api/users', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ uid_user: 'abc', password: 'newpass' }),
		});
		const res = await PUT(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(admin.updateUserById).toHaveBeenCalledWith('abc', { password: 'newpass' });
	});

	it('updates user profile fields', async () => {
		const { chain } = mockSupabase();
		chain.single.mockResolvedValue({
			data: {
				uid_user: 'abc',
				username: 'updated',
				role: 'Admin',
				name: 'Juan',
				last_name: 'Pérez',
			},
			error: null,
		});

		const req = new Request('http://localhost/api/users', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				uid_user: 'abc',
				username: 'updated',
				role: 'Admin',
				name: 'Juan',
				last_name: 'Pérez',
			}),
		});
		const res = await PUT(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.data.username).toBe('updated');
		expect(body.data.name).toBe('Juan');
		expect(body.data.last_name).toBe('Pérez');
		expect(chain.update).toHaveBeenCalledWith(
			expect.objectContaining({
				username: 'updated',
				role: 'Admin',
				name: 'Juan',
				last_name: 'Pérez',
			})
		);
	});

	it('updates both password and profile fields', async () => {
		const { chain, admin } = mockSupabase();
		admin.updateUserById.mockResolvedValue({ error: null });
		chain.single.mockResolvedValue({
			data: { uid_user: 'abc', username: 'user1', role: 'Taller', name: 'New', last_name: 'Name' },
			error: null,
		});

		const req = new Request('http://localhost/api/users', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				uid_user: 'abc',
				password: 'newpass',
				username: 'user1',
				name: 'New',
				last_name: 'Name',
				role: 'Taller',
			}),
		});
		const res = await PUT(req);

		expect(res.status).toBe(200);
		expect(admin.updateUserById).toHaveBeenCalledWith('abc', { password: 'newpass' });
	});

	it('returns 400 when password update fails', async () => {
		const { admin } = mockSupabase();
		admin.updateUserById.mockResolvedValue({
			error: { message: 'Password too weak' },
		});

		const req = new Request('http://localhost/api/users', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ uid_user: 'abc', password: 'weak' }),
		});
		const res = await PUT(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBe('Password too weak');
	});
});

describe('DELETE /api/users', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.url';
		process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
		requireAdmin.mockResolvedValue({ id: 'admin-uid' });
	});

	it('returns 401 when not authenticated', async () => {
		requireAdmin.mockRejectedValue(new Error('UNAUTHORIZED'));

		const req = new Request('http://localhost/api/users', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ uid_user: 'abc' }),
		});
		const res = await DELETE(req);
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toBe('No autenticado');
	});

	it('returns 400 when uid_user is missing', async () => {
		const req = new Request('http://localhost/api/users', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});
		const res = await DELETE(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBe('Falta uid_user');
	});

	it('deletes a user successfully', async () => {
		const { admin } = mockSupabase();
		admin.deleteUser.mockResolvedValue({ error: null });

		const req = new Request('http://localhost/api/users', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ uid_user: 'abc-123' }),
		});
		const res = await DELETE(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(admin.deleteUser).toHaveBeenCalledWith('abc-123');
	});

	it('returns 400 when auth delete fails', async () => {
		const { admin } = mockSupabase();
		admin.deleteUser.mockResolvedValue({
			error: { message: 'User not found' },
		});

		const req = new Request('http://localhost/api/users', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ uid_user: 'nonexistent' }),
		});
		const res = await DELETE(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBe('User not found');
	});
});
