/**
 * @jest-environment node
 */

// These routes use the service role key, which skips every database rule: the route is the only gate.
import { POST as dollarRatePost, GET as dollarRateGet } from '@/app/api/dollar-rate/route';
import { POST as budgetDollarRatePost } from '@/app/api/budget-dollar-rate/route';
import { POST as updatePricesPost } from '@/app/api/update-prices/route';
import { POST as galleryUpload } from '@/app/api/gallery/upload/route';
import { DELETE as galleryDelete } from '@/app/api/gallery/delete/route';
import { GET as galleryList } from '@/app/api/gallery/list/route';
import { POST as sendEmailPost } from '@/app/api/send-email/route';
import { POST as sendWhatsappPost } from '@/app/api/send-whatsapp/route';

const mockProfiles: Record<
	string,
	{ role: string; views: string[] | null; edits: string[] | null }
> = {
	'admin-token': { role: 'Admin', views: null, edits: null },
	'taller-token': { role: 'Taller', views: null, edits: null },
	'viewer-token': { role: 'Admin', views: ['supplies'], edits: [] },
};

// A database that answers like an empty one, so allowed callers get past the check without side effects.
const mockEmptyQuery: any = new Proxy(
	{},
	{
		get: (_target, prop) =>
			prop === 'then'
				? (resolve: any) => resolve({ data: null, error: { message: 'empty' } })
				: () => mockEmptyQuery,
	}
);

let mockCurrentToken: string | null = null;

jest.mock('@/lib/get-service-role-client', () => ({
	getServiceRoleClient: () => ({
		auth: {
			getUser: async (token: string) => {
				mockCurrentToken = token;
				return mockProfiles[token]
					? { data: { user: { id: `uid-${token}` } }, error: null }
					: { data: { user: null }, error: { message: 'invalid' } };
			},
		},
		from: (table: string) =>
			table === 'users'
				? {
						select: () => ({
							eq: () => ({
								maybeSingle: async () => ({
									data: mockProfiles[mockCurrentToken!] ?? null,
									error: null,
								}),
							}),
						}),
					}
				: mockEmptyQuery,
		storage: { from: () => mockEmptyQuery },
	}),
}));

const request = (url: string, token: string | null, init: RequestInit = {}) =>
	new Request(`http://localhost${url}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	});

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });

const ROUTES: { name: string; call: (token: string | null) => Promise<Response> }[] = [
	{
		name: 'POST /api/dollar-rate',
		call: (t) =>
			dollarRatePost(request('/api/dollar-rate', t, json({ balanceId: 1, newUsdRate: 1000 }))),
	},
	{
		name: 'POST /api/budget-dollar-rate',
		call: (t) =>
			budgetDollarRatePost(
				request('/api/budget-dollar-rate', t, json({ budgetId: 1, newUsdRate: 1000 }))
			),
	},
	{
		name: 'POST /api/update-prices',
		call: (t) =>
			updatePricesPost(
				request('/api/update-prices', t, json({ entries: [{ code: 'A', price: 1 }] }))
			),
	},
	{
		name: 'POST /api/gallery/upload',
		call: (t) => galleryUpload(request('/api/gallery/upload', t, json({}))),
	},
	{
		name: 'DELETE /api/gallery/delete',
		call: (t) => galleryDelete(request('/api/gallery/delete?code_name=A', t, { method: 'DELETE' })),
	},
	{
		name: 'POST /api/send-email',
		call: (t) => sendEmailPost(request('/api/send-email', t, json({}))),
	},
	{
		name: 'POST /api/send-whatsapp',
		call: (t) => sendWhatsappPost(request('/api/send-whatsapp', t, json({}))),
	},
];

describe('service-role API routes', () => {
	describe.each(ROUTES)('$name', ({ call }) => {
		test('without a session: 401', async () => {
			expect((await call(null)).status).toBe(401);
		});

		test('with an invalid session: 401', async () => {
			expect((await call('forged-token')).status).toBe(401);
		});

		test('a Taller user, who cannot edit this by default: 403', async () => {
			expect((await call('taller-token')).status).toBe(403);
		});

		test('an admin without customization gets past the check, as today', async () => {
			expect([401, 403]).not.toContain((await call('admin-token')).status);
		});
	});

	test('an admin who can only look at supplies cannot change prices', async () => {
		const res = await updatePricesPost(
			request('/api/update-prices', 'viewer-token', json({ entries: [{ code: 'A', price: 1 }] }))
		);
		expect(res.status).toBe(403);
	});

	test('supply photos can be listed by whoever sees supplies', async () => {
		expect((await galleryList(request('/api/gallery/list?name_code=A', null))).status).toBe(401);
		expect([401, 403]).not.toContain(
			(await galleryList(request('/api/gallery/list?name_code=A', 'viewer-token'))).status
		);
	});

	test('the official dollar rate needs a session, but no special permission', async () => {
		expect((await dollarRateGet(request('/api/dollar-rate', null))).status).toBe(401);
	});
});
