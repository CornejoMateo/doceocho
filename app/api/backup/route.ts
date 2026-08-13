import { NextResponse } from 'next/server';

export async function POST() {
	console.log('🔥 BACKUP API EJECUTADA');

	return NextResponse.json({
		success: true,
		message: 'El endpoint funciona',
	});
}
