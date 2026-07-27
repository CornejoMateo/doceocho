import { NextResponse } from 'next/server';
import { verifyQRToken } from '@/lib/qr/qr-token';

export async function POST(req: Request) {
	try {
		const body = await req.json();

		const { token } = body;

		if (!token || typeof token !== 'string') {
			return NextResponse.json(
				{
					success: false,
					message: 'Token inválido',
				},
				{
					status: 400,
				}
			);
		}

		await verifyQRToken(token);

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
		console.error(error);

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
