/**
 * @jest-environment node
 */

import { GET } from '@/app/api/budget-builder/[token]/route';
import { POST } from '@/app/api/budget-builder/[token]/respond/route';

const mockMaybeSingle = jest.fn();
const mockUpdate = jest.fn();
const mockIs = jest.fn();
const mockNotify = jest.fn();

jest.mock('@/lib/get-service-role-client', () => ({
	getServiceRoleClient: () => {
		const chain: any = {
			select: () => chain,
			eq: () => chain,
			is: (...args: any[]) => {
				mockIs(...args);
				return chain;
			},
			update: (values: any) => {
				mockUpdate(values);
				return chain;
			},
			maybeSingle: () => mockMaybeSingle(),
		};
		return { from: () => chain };
	},
}));

jest.mock('@/lib/push/send-budget-response-notification', () => ({
	sendBudgetResponseNotification: (...args: any[]) => mockNotify(...args),
}));

const TOKEN = '6f1c2a7e-3b9d-4c8e-9a0b-1d2e3f4a5b6c';
const params = (token = TOKEN) => ({ params: Promise.resolve({ token }) });

const budgetRow = {
	id: 'b1',
	number: 7,
	created_at: '2026-10-20T10:00:00Z',
	client_name: 'Ana',
	client_contact: '',
	status: 'enviado',
	margin_percent: 50,
	validity_days: 15,
	notes: '',
	items: [
		{
			id: 'i1',
			name: 'Banco',
			templateId: null,
			shape: 'bloque',
			dimensions: { width: 40, depth: 35, height: 45, thickness: 3, legs: 0, shelves: 0, doors: 0 },
			finish: 'roble',
			units: 1,
			notes: '',
			lines: [
				{
					id: 'l1',
					itemId: 'x',
					name: 'Madera secreta',
					category: 'Madera',
					unit: 'unidad',
					price: 1000,
					quantity: '2',
				},
			],
		},
	],
	public_token: TOKEN,
	client_response: null,
	client_comment: null,
	responded_at: null,
};

const post = (body: unknown) =>
	new Request(`http://localhost/api/budget-builder/${TOKEN}/respond`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}) as any;

beforeEach(() => jest.clearAllMocks());

describe('GET /api/budget-builder/[token]', () => {
	it('rejects a token that is not a uuid', async () => {
		const res = await GET({} as any, params('nope'));
		expect(res.status).toBe(400);
	});

	it('returns 404 for an unknown link', async () => {
		mockMaybeSingle.mockResolvedValue({ data: null });

		const res = await GET({} as any, params());
		expect(res.status).toBe(404);
	});

	it('returns final prices only, never the cost lines or margin', async () => {
		mockMaybeSingle
			.mockResolvedValueOnce({ data: budgetRow })
			.mockResolvedValueOnce({ data: { company: { name: 'Doce Ocho' } } });

		const res = await GET({} as any, params());
		const body = await res.json();
		const json = JSON.stringify(body);

		expect(res.status).toBe(200);
		// 2 × 1000 of cost with 50% margin.
		expect(body.budget.total).toBe(3000);
		expect(body.budget.code).toBe('P-0007');
		expect(json).not.toContain('Madera secreta');
		expect(json).not.toContain('margin');
		expect(body.response).toBeNull();
	});
});

describe('POST /api/budget-builder/[token]/respond', () => {
	it('records an approval and moves the status', async () => {
		mockMaybeSingle.mockResolvedValue({ data: { id: 'b1', number: 7, client_name: 'Ana' } });

		const res = await POST(post({ decision: 'aprobado' }), params());
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				client_response: 'aprobado',
				status: 'aprobado',
				client_comment: null,
			})
		);
		// Only an unanswered budget may change.
		expect(mockIs).toHaveBeenCalledWith('client_response', null);
		expect(body.response.decision).toBe('aprobado');
		expect(mockNotify).toHaveBeenCalledWith(expect.anything(), 'P-0007', 'Ana', 'aprobado', 'b1');
	});

	it('refuses a second answer', async () => {
		mockMaybeSingle.mockResolvedValue({ data: null, error: null });

		const res = await POST(post({ decision: 'rechazado' }), params());
		expect(res.status).toBe(409);
		expect(mockNotify).not.toHaveBeenCalled();
	});

	it('refuses an invalid answer without touching the database', async () => {
		const res = await POST(post({ decision: 'borrador' }), params());

		expect(res.status).toBe(400);
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('keeps the answer even if notifying admins fails', async () => {
		mockMaybeSingle.mockResolvedValue({ data: { id: 'b1', number: 7, client_name: 'Ana' } });
		mockNotify.mockRejectedValue(new Error('push down'));

		const res = await POST(post({ decision: 'aprobado' }), params());
		expect(res.status).toBe(200);
	});
});
