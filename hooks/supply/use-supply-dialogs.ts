import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import type { SupplyItemStock } from '@/lib/stock/supplies-stock';

export function useSupplyDialogs(
	onUpdateQuantity: (id: number, newQuantity: number) => Promise<void>
) {
	const [showQuantityDialog, setShowQuantityDialog] = useState(false);
	const [quantityDialogType, setQuantityDialogType] = useState<'increase' | 'decrease' | null>(
		null
	);
	const [quantityChange, setQuantityChange] = useState<number | ''>('');
	const [currentItemId, setCurrentItemId] = useState<number | null>(null);
	const [currentItemTotal, setCurrentItemTotal] = useState<number>(0);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
	const [imageViewerOpen, setImageViewerOpen] = useState(false);
	const [imageLoading, setImageLoading] = useState(false);

	const openQuantityDialog = (id: number, type: 'increase' | 'decrease', currentQty: number) => {
		setCurrentItemId(id);
		setCurrentItemTotal(currentQty);
		setQuantityDialogType(type);
		setQuantityChange('');
		setShowQuantityDialog(true);
	};

	const confirmQuantityUpdate = async () => {
		if (!currentItemId || quantityChange === '' || !quantityDialogType) {
			toast({ title: 'Error', description: 'Ingrese una cantidad válida', variant: 'destructive' });
			return;
		}

		const adjustment = Number(quantityChange);
		if (adjustment < 0) {
			toast({
				title: 'Error',
				description: 'La cantidad debe ser positiva',
				variant: 'destructive',
			});
			return;
		}

		const nextQuantity =
			quantityDialogType === 'increase'
				? currentItemTotal + adjustment
				: currentItemTotal - adjustment;
		if (nextQuantity < 0) {
			toast({
				title: 'Error',
				description: `No puede disminuir ${adjustment} unidades. Solo tiene ${currentItemTotal} disponibles`,
				variant: 'destructive',
			});
			return;
		}

		await onUpdateQuantity(currentItemId, nextQuantity);
		toast({
			title: 'Éxito',
			description: `Cantidad ${quantityDialogType === 'increase' ? 'aumentada' : 'disminuida'} correctamente`,
		});
		setShowQuantityDialog(false);
		setCurrentItemId(null);
		setCurrentItemTotal(0);
		setQuantityChange('');
		setQuantityDialogType(null);
	};

	const openImageViewer = async (item: SupplyItemStock) => {
		try {
			setSelectedImage(null);
			setImageViewerOpen(true);
			setImageLoading(true);
			const params = new URLSearchParams({ name_code: item.supply_code });
			const res = await fetch(`/api/gallery/list?${params.toString()}`);
			const data = await res.json();

			if (!data.success) {
				setImageViewerOpen(false);
				toast({
					title: 'Error',
					description: translateError(data.error) || 'No se pudo cargar la imagen',
					variant: 'destructive',
				});
				return;
			}

			const imageUrl = data.images?.[0]?.image_url;
			if (!imageUrl) {
				setImageViewerOpen(false);
				toast({
					title: 'Sin imagen',
					description:
						translateError('No se encontró una imagen para este insumo') ||
						'No se encontró una imagen para este insumo',
					variant: 'destructive',
				});
				return;
			}

			setSelectedImage(imageUrl);
			setImageViewerOpen(true);
		} catch {
			setImageViewerOpen(false);
			toast({
				title: 'Error',
				description: translateError('No se pudo cargar la imagen') || 'No se pudo cargar la imagen',
				variant: 'destructive',
			});
		} finally {
			setImageLoading(false);
		}
	};

	return {
		showQuantityDialog,
		setShowQuantityDialog,
		quantityDialogType,
		quantityChange,
		setQuantityChange,
		confirmQuantityUpdate,
		openQuantityDialog,
		selectedImage,
		imageViewerOpen,
		setImageViewerOpen,
		imageLoading,
		openImageViewer,
	};
}
