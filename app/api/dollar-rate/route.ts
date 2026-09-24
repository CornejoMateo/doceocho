import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface DollarRateRequest {
	balanceId: number;
	newBalanceAmountARS?: number;
	newUsdRate: number;
}

export async function POST(req: Request) {
	try {
		const body: DollarRateRequest = await req.json();

		const { balanceId, newBalanceAmountARS, newUsdRate } = body;

		if (!balanceId || !newUsdRate) {
			return NextResponse.json(
				{ error: 'Faltan datos requeridos: balanceId y newUsdRate' },
				{ status: 400 }
			);
		}

		// Validate USD rate is positive
		if (newUsdRate <= 0) {
			return NextResponse.json(
				{ error: 'El tipo de cambio debe ser un valor positivo' },
				{ status: 400 }
			);
		}

		// Use service role key if available, otherwise fall back to anon key
		const supabaseKey =
			process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!supabaseKey) {
			console.error('No Supabase key available (neither SERVICE_ROLE_KEY nor ANON_KEY)');
			return NextResponse.json(
				{ error: 'Configuración de base de datos no disponible' },
				{ status: 500 }
			);
		}

		const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey);

		// First, get the current balance to verify it exists and get the budget info
		const { data: existingBalance, error: fetchError } = await supabase
			.from('balances')
			.select('*')
			.eq('id', balanceId)
			.single();

		if (fetchError) {
			console.error('Error fetching balance:', fetchError);
			return NextResponse.json(
				{ error: 'No se encontró la cuenta corriente especificada' },
				{ status: 404 }
			);
		}

		if (!existingBalance) {
			return NextResponse.json({ error: 'Cuenta corriente no encontrada' }, { status: 404 });
		}

		const updatedBalanceAmountARS = newBalanceAmountARS ?? existingBalance.balance_amount_ars;
		const oldUsd = existingBalance.usd_current;
		const updatePayload: {
			usd_current: number;
			balance_amount_ars?: number | null;
		} = {
			usd_current: newUsdRate,
		};

		if (newBalanceAmountARS !== undefined) {
			updatePayload.balance_amount_ars = updatedBalanceAmountARS;
		}

		const { data: updatedBalance, error: updateError } = await supabase
			.from('balances')
			.update(updatePayload)
			.eq('id', balanceId)
			.select()
			.single();

		if (updateError) {
			console.error('Error updating balance:', updateError);
			return NextResponse.json(
				{ error: 'Error al actualizar el tipo de cambio del dólar' },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: 'Valor del dólar actualizado exitosamente',
			data: {
				balanceId,
				oldUsdRate: oldUsd,
				newUsdRate,
				newBalanceAmountARS: updatedBalance.balance_amount_ars,
			},
		});
	} catch (err: any) {
		console.error('Error en API dollar-rate:', err);
		return NextResponse.json(
			{ error: err.message || 'Error interno del servidor' },
			{ status: 500 }
		);
	}
}

export async function GET(req: Request) {
	try {
		// Fetch current dollar rate from external API
		const response = await fetch('https://dolarapi.com/v1/dolares/oficial');

		if (!response.ok) {
			throw new Error('No se pudo obtener la cotización del dólar');
		}

		const dollarData = await response.json();

		return NextResponse.json({
			success: true,
			data: {
				rate: dollarData.venta,
				buyRate: dollarData.compra,
				sellRate: dollarData.venta,
				name: dollarData.nombre,
				currency: dollarData.moneda,
				lastUpdated: dollarData.fechaActualizacion,
			},
		});
	} catch (err: any) {
		console.error('Error en API dollar-rate GET:', err);
		return NextResponse.json(
			{ error: err.message || 'Error al obtener la cotización del dólar' },
			{ status: 500 }
		);
	}
}
