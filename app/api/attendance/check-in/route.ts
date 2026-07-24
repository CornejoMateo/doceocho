import { NextResponse } from 'next/server';
import { verifyQRToken } from '@/lib/qr/qr-token';

export async function POST(req: Request) {
	try {
		const body = await req.json();

		console.log('CHECK-IN BODY:', body);

		const { token } = body;

		await verifyQRToken(token);

		console.log('QR válido');

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
		console.error('QR ERROR:', error);

		return NextResponse.json(
			{
				success: false,
				message: 'QR inválido o expirado',
			},
			{
				status: 401,
			}
		);
	}
}
