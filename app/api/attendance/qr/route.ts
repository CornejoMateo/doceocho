import { NextResponse } from 'next/server';
import { createQRToken } from '@/lib/qr/qr-token';

export async function GET() {
	try {
		const token = await createQRToken();

		return NextResponse.json({
			token,
		});
	} catch (error) {
		console.error('Error generando QR:', error);

		return NextResponse.json(
			{
				error: 'No se pudo generar QR',
			},
			{
				status: 500,
			}
		);
	}
}
