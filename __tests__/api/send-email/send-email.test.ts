/**
 * @jest-environment node
 */

jest.mock('next/server', () => ({
	NextResponse: {
		json: (data: any, init?: ResponseInit) =>
			new Response(JSON.stringify(data), {
				status: init?.status ?? 200,
				headers: { 'Content-Type': 'application/json' },
			}),
	},
}));

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(),
}));

jest.mock('nodemailer', () => ({
	createTransport: jest.fn(),
}));

const mockCreateClient = jest.mocked(require('@supabase/supabase-js').createClient);
const mockCreateTransport = jest.mocked(require('nodemailer').createTransport);

const mockSendMail = jest.fn();
const mockVerify = jest.fn();

function mockSupabase() {
	const chain = {
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		single: jest.fn(),
	};
	mockCreateClient.mockReturnValue({
		from: jest.fn(() => chain),
	});
	return chain;
}

function mockTransporter() {
	mockCreateTransport.mockReturnValue({
		sendMail: mockSendMail,
		verify: mockVerify,
	});
}

function buildRequest(body: Record<string, any>) {
	return new Request('http://localhost/api/send-email', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

describe('POST /api/send-email', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockTransporter();
		process.env.SMTP_HOST = 'smtp.test.com';
		process.env.SMTP_PORT = '587';
		process.env.SMTP_USER = 'test@test.com';
		process.env.SMTP_PASS = 'password';
		process.env.EMAIL_FROM = 'noreply@test.com';
	});

	it('returns 400 when required fields are missing', async () => {
		const { POST } = await import('@/app/api/send-email/route');

		const req = buildRequest({ clientId: 1, workId: 1 });
		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain('Faltan campos requeridos');
	});

	it('returns 400 when subject is missing', async () => {
		const { POST } = await import('@/app/api/send-email/route');

		const req = buildRequest({ clientId: 1, workId: 1, to: 'test@test.com', message: 'Hola' });
		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(400);
	});

	it('returns 400 when email format is invalid', async () => {
		const { POST } = await import('@/app/api/send-email/route');

		const req = buildRequest({
			clientId: 1,
			workId: 1,
			to: 'not-an-email',
			subject: 'Test',
			message: 'Hola',
		});
		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toContain('inválido');
	});

	it('sends email successfully', async () => {
		const chain = mockSupabase();
		chain.single.mockResolvedValueOnce({
			data: { name: 'Juan', last_name: 'Pérez' },
			error: null,
		});
		chain.single.mockResolvedValueOnce({
			data: { locality: 'Córdoba', address: 'Av. Paz 123' },
			error: null,
		});
		mockSendMail.mockResolvedValue({ messageId: 'msg-123' });

		const { POST } = await import('@/app/api/send-email/route');

		const req = buildRequest({
			clientId: 1,
			workId: 10,
			to: 'cliente@test.com',
			subject: 'Notificación',
			message: 'Hola cliente',
		});
		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.messageId).toBe('msg-123');
		expect(body.data.to).toBe('cliente@test.com');
		expect(mockSendMail).toHaveBeenCalledTimes(1);
	});

	it('includes arrivalDate when date and time are scheduled', async () => {
		const chain = mockSupabase();
		chain.single.mockResolvedValue({ data: null, error: null });
		mockSendMail.mockResolvedValue({ messageId: 'msg-456' });

		const { POST } = await import('@/app/api/send-email/route');

		const req = buildRequest({
			clientId: 1,
			workId: 10,
			to: 'cliente@test.com',
			subject: 'Test',
			message: 'Msg',
			scheduledDate: '2026-08-01',
			scheduledTime: '14:30',
		});
		const res = await POST(req);
		const body = await res.json();

		expect(body.data.arrivalDate).toBe('2026-08-01T14:30');
	});

	it('returns null arrivalDate when no date is scheduled', async () => {
		const chain = mockSupabase();
		chain.single.mockResolvedValue({ data: null, error: null });
		mockSendMail.mockResolvedValue({ messageId: 'msg-789' });

		const { POST } = await import('@/app/api/send-email/route');

		const req = buildRequest({
			clientId: 1,
			workId: 10,
			to: 'cliente@test.com',
			subject: 'Test',
			message: 'Msg',
		});
		const res = await POST(req);
		const body = await res.json();

		expect(body.data.arrivalDate).toBeNull();
	});

	it('returns 500 when nodemailer fails', async () => {
		const chain = mockSupabase();
		chain.single.mockResolvedValue({ data: null, error: null });
		mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

		const { POST } = await import('@/app/api/send-email/route');

		const req = buildRequest({
			clientId: 1,
			workId: 10,
			to: 'cliente@test.com',
			subject: 'Test',
			message: 'Msg',
		});
		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(500);
		expect(body.error).toContain('SMTP connection refused');
	});
});
