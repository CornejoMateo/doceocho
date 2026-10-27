import { NextResponse } from 'next/server';
import { authorize } from '@/helpers/users/require-permission';
import { API_PERMISSIONS } from '@/constants/permissions/views';

interface Entry {
	code: string;
	price: number;
}

// Small helper to chunk an array
function chunkArray<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
	return chunks;
}

export async function POST(req: Request) {
	try {
		const auth = await authorize(req, API_PERMISSIONS.updatePrices);
		if ('response' in auth) return auth.response;
		const { supabase } = auth;

		console.log('=== API update-prices called ===');
		const body = await req.json();
		console.log(`Received ${body.entries?.length || 0} entries`);
		const entries: Entry[] = body.entries;

		if (!Array.isArray(entries) || entries.length === 0) {
			return NextResponse.json(
				{ updated: 0, errors: ['No hay entradas para procesar'] },
				{ status: 400 }
			);
		}

		const codes = entries.map((e) => e.code);
		const now = new Date().toISOString();

		const { data: supplyCodes, error: supplyErr } = await supabase
			.from('stock_supplies')
			.select('supply_code')
			.in('supply_code', codes);

		if (supplyErr) console.error('Error fetching supplies:', supplyErr);

		const supplyCodeSet = new Set((supplyCodes || []).map((r: any) => r.supply_code));
		console.log(`Found ${supplyCodeSet.size} supplies to update.`);

		let updated = 0;

		// Separate entries by table
		const supplyEntries = entries.filter((e) => supplyCodeSet.has(e.code));

		// Update supplies in parallel groups
		const SUPPLY_CONCURRENCY = 10;
		for (let i = 0; i < supplyEntries.length; i += SUPPLY_CONCURRENCY) {
			const group = supplyEntries.slice(i, i + SUPPLY_CONCURRENCY);
			const updatePromises = group.map(async (entry) => {
				const { error } = await supabase
					.from('stock_supplies')
					.update({ supply_price: entry.price, last_update: now })
					.eq('supply_code', entry.code);

				if (error) {
					console.error(`Error updating supply ${entry.code}:`, error);
					return 0;
				}
				return 1;
			});

			const results = await Promise.all(updatePromises);
			const count = results.reduce((sum: number, c: number) => sum + c, 0);
			console.log(`Updated ${count} supplies in group`);
			updated += count;
		}

		console.log(`=== Total updated: ${updated} ===`);
		return NextResponse.json({ updated });
	} catch (err: any) {
		console.error('Error en API update-prices:', err);
		return NextResponse.json(
			{ updated: 0, errors: [err.message || 'Error desconocido'] },
			{ status: 500 }
		);
	}
}
