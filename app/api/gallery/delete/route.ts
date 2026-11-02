import { NextResponse } from 'next/server';
import { authorize } from '@/helpers/users/require-permission';
import { API_PERMISSIONS } from '@/constants/permissions/views';

export async function DELETE(req: Request) {
	try {
		const auth = await authorize(req, API_PERMISSIONS.galleryWrite);
		if ('response' in auth) return auth.response;
		const { supabase } = auth;
		const { searchParams } = new URL(req.url);
		const code_name = searchParams.get('code_name')!;

		if (!code_name) {
			return NextResponse.json({ success: false, error: 'Código no completado' }, { status: 400 });
		}

		const galleryTable = 'gallery_supplies';
		const stockTable = 'stock_supplies';
		const query = supabase.from(galleryTable).select('id, image_path').eq('supply_code', code_name);

		const { data: rows, error } = await query;

		if (error) throw error;

		if (!rows || rows.length === 0) {
			return NextResponse.json({ success: true });
		}

		const imagePaths = rows.map((row) => row.image_path).filter(Boolean) as string[];

		if (imagePaths.length > 0) {
			await supabase.storage.from('stock_supplies').remove(imagePaths);
		}

		const ids = rows.map((r) => r.id);

		const { error: updateError } = await supabase
			.from(stockTable)
			.update({ image_id: null })
			.in('image_id', ids);

		const { error: deleteError } = await supabase.from(galleryTable).delete().in('id', ids);

		if (updateError) {
			return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
		}

		if (deleteError) {
			return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Error deleting option:', error);
		return NextResponse.json({ success: false, error: error.message }, { status: 500 });
	}
}
