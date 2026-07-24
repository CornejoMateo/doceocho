import { NextResponse } from 'next/server';
import { verifyQRToken } from '@/lib/qr/qr-token';

export async function POST(req: Request) {
	try {
		const { token } = await req.json();

		await verifyQRToken(token);

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
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
