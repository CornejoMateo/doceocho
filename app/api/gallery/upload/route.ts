import { NextResponse } from 'next/server';
import { authorize } from '@/helpers/users/require-permission';
import { API_PERMISSIONS } from '@/constants/permissions/views';
import sharp from 'sharp';

export async function POST(req: Request) {
	try {
		const auth = await authorize(req, API_PERMISSIONS.galleryWrite);
		if ('response' in auth) return auth.response;
		const { supabase } = auth;
		const formData = await req.formData();
		const file = formData.get('file') as File;
		const name_code = formData.get('name_code') as string;

		if (!file || !name_code) {
			return NextResponse.json(
				{ success: false, error: 'Faltan campos obligatorios' },
				{ status: 400 }
			);
		}

		const path = 'supplies';
		const galleryTable = 'gallery_supplies';
		const stockTable = 'stock_supplies';

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const compressed = await sharp(buffer)
			.resize({ width: 1200, withoutEnlargement: true })
			.jpeg({ quality: 75, mozjpeg: true })
			.toBuffer();

		const ext = 'jpg';
		const fileName = `${crypto.randomUUID()}.${ext}`;

		const filePath = `${path}/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('stock_supplies')
			.upload(filePath, compressed, {
				contentType: 'image/jpeg',
				upsert: true,
			});

		if (uploadError) throw uploadError;

		const image_path = filePath;

		const { data: publicUrlData } = supabase.storage.from('stock_supplies').getPublicUrl(filePath);

		const image_url = publicUrlData.publicUrl;

		const { data: imageRow, error: insertError } = await supabase
			.from(galleryTable)
			.insert({
				supply_code: name_code,
				image_url: image_url,
				image_path,
			})
			.select('id')
			.single();

		if (insertError) {
			await supabase.storage.from('stock_supplies').remove([filePath]);
			throw insertError;
		}

		const { data: matchingRows, error: searchError } = await supabase
			.from(stockTable)
			.select('id')
			.eq('supply_code', name_code);

		if (searchError) throw searchError;

		if (matchingRows && matchingRows.length > 0) {
			const idsToUpdate = matchingRows.map((row: any) => row.id);

			const { error } = await supabase
				.from(stockTable)
				.update({ image_id: imageRow.id, last_update: new Date().toISOString().split('T')[0] })
				.in('id', idsToUpdate);

			if (error) {
				console.error('Error updating supplies with new image URL:', error);

				// rollback gallery row
				await supabase.from(galleryTable).delete().eq('id', imageRow.id);

				// rollback storage image
				await supabase.storage.from('stock_supplies').remove([filePath]);

				throw error;
			}
		}

		return NextResponse.json({
			success: true,
			image_id: imageRow.id,
			image_url: image_url,
			image_path,
		});
	} catch (err) {
		console.error(err);
		return NextResponse.json({ success: false, error: 'Error al subir imagen' }, { status: 500 });
	}
}
