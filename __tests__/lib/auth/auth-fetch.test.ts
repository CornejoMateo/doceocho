jest.unmock('@/lib/auth/auth-fetch');

const mockGetSession = jest.fn();
jest.mock('@/lib/supabase-client', () => ({
	getSupabaseClient: () => ({ auth: { getSession: mockGetSession } }),
}));

import { authFetch } from '@/lib/auth/auth-fetch';

describe('lib/auth/auth-fetch', () => {
	beforeEach(() => {
		global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
	});

	test('sends the session token and keeps the request as it was', async () => {
		mockGetSession.mockResolvedValue({ data: { session: { access_token: 'abc' } } });

		await authFetch('/api/update-prices', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{}',
		});

		const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
		expect(url).toBe('/api/update-prices');
		expect(init.method).toBe('POST');
		expect(init.body).toBe('{}');
		expect(init.headers.get('Authorization')).toBe('Bearer abc');
		expect(init.headers.get('Content-Type')).toBe('application/json');
	});

	test('without a session it sends no token, and the route answers 401', async () => {
		mockGetSession.mockResolvedValue({ data: { session: null } });

		await authFetch('/api/gallery/list');

		const [, init] = (global.fetch as jest.Mock).mock.calls[0];
		expect(init.headers.get('Authorization')).toBeNull();
	});
});
