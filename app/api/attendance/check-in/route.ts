import { NextResponse } from 'next/server';
import { verifyQRToken } from '@/lib/qr/qr-token';

export async function POST(req: Request) {
	try {
		const { token } = await req.json();

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
	} catch {
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
