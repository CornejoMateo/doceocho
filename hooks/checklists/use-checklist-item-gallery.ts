import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase-client';
import {
	getChecklistGalleryByItemId,
	deleteChecklistGalleryItem,
} from '@/lib/checklists/checklist-gallery';

const BUCKET = 'checklist-gallery';

export interface GalleryImage {
	id: number;
	name: string;
	title: string | null;
	url: string;
	uploaded_at: string;
}

export function useChecklistItemGallery(itemId: number) {
	const [images, setImages] = useState<GalleryImage[]>([]);
	const [loading, setLoading] = useState(false);

	const loadImages = useCallback(async () => {
		if (!itemId) return;
		setLoading(true);

		try {
			const { data: records } = await getChecklistGalleryByItemId(itemId);
			if (!records) {
				setImages([]);
				return;
			}

			const supabase = getSupabaseClient();
			const itemsWithUrls = await Promise.all(
				records
					.filter((r) => r.path)
					.map(async (record) => {
						const { data: urlData } = await supabase.storage
							.from(BUCKET)
							.createSignedUrl(record.path!, 60 * 60);

						return {
							id: record.id,
							name: record.path!.split('/').pop() || '',
							title: record.title,
							url: urlData?.signedUrl || '',
							uploaded_at: record.created_at || '',
						};
					})
			);
			setImages(itemsWithUrls);
		} catch {
			setImages([]);
		} finally {
			setLoading(false);
		}
	}, [itemId]);

	useEffect(() => {
		loadImages();
	}, [loadImages]);

	const deleteImage = async (id: number) => {
		const { success, error } = await deleteChecklistGalleryItem(id);
		if (success) {
			setImages((prev) => prev.filter((img) => img.id !== id));
		}
		return { success, error };
	};

	return { images, loading, reload: loadImages, deleteImage };
}
