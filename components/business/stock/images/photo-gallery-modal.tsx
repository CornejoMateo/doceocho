'use client';

import { authFetch } from '@/lib/auth/auth-fetch';

import { useState } from 'react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import ImageViewer from '@/components/ui/image-viewer';

interface PhotoGalleryModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type GalleryImage = {
	id?: number;
	image_url?: string | null;
};

export function PhotoGalleryModal({ open, onOpenChange }: PhotoGalleryModalProps) {
	const { toast } = useToast();
	const [file, setFile] = useState<File | null>(null);
	const [nameCode, setNameCode] = useState('');
	const [loading, setLoading] = useState(false);
	const [loadingSearch, setLoadingSearch] = useState(false);
	const [searched, setSearched] = useState(false);
	const [images, setImages] = useState<GalleryImage[]>([]);
	const [imagesLoading, setImagesLoading] = useState(false);
	const [imagesError, setImagesError] = useState<string | null>(null);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);

	const resetState = () => {
		setSelectedImage(null);
		setNameCode('');
		setImages([]);
		setImagesError(null);
		setSearched(false);
		setFile(null);
	};

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) resetState();
		onOpenChange(newOpen);
	};

	const fetchImages = async (code: string) => {
		try {
			setImagesLoading(true);
			setImagesError(null);
			const params = new URLSearchParams({ name_code: code });
			const res = await authFetch(`/api/gallery/list?${params.toString()}`);
			const data = await res.json();
			if (data.success) {
				setImages(data.images ?? []);
			} else {
				setImages([]);
				setImagesError(data.error ?? 'Error al obtener imágenes');
			}
		} catch (error: any) {
			setImages([]);
			setImagesError(error?.message ?? 'Error al obtener imágenes');
		} finally {
			setImagesLoading(false);
		}
	};

	const handleSearch = async () => {
		if (!nameCode) {
			toast({ title: 'Error', description: 'Ingresá un código', variant: 'destructive' });
			return;
		}
		setLoadingSearch(true);
		await fetchImages(nameCode);
		setSearched(true);
		setLoadingSearch(false);
	};

	const handleUpload = async () => {
		if (!file) {
			toast({ title: 'Error', description: 'Seleccioná una imagen', variant: 'destructive' });
			return;
		}
		if (!nameCode) {
			toast({ title: 'Error', description: 'Ingresá un código', variant: 'destructive' });
			return;
		}

		try {
			setLoading(true);
			const formData = new FormData();
			formData.append('file', file);
			formData.append('name_code', nameCode);

			const res = await authFetch('/api/gallery/upload', {
				method: 'POST',
				body: formData,
			});
			const data = await res.json();

			if (data.success) {
				toast({ title: '¡Éxito!', description: 'Imagen subida correctamente', duration: 3000 });
				setFile(null);
				setNameCode('');
				setImages([]);
				setSearched(false);
			} else {
				toast({
					title: 'Error',
					description: data.error || 'Ocurrió un error al subir la imagen',
					variant: 'destructive',
				});
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Ocurrió un error al subir la imagen',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-[600px] w-full">
				<DialogHeader>
					<DialogTitle>Agregar y buscar fotos</DialogTitle>
					<DialogDescription>Subí y buscá imágenes por código de insumo.</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 p-6">
					<Input
						value={nameCode}
						onChange={(e) => {
							setNameCode(e.target.value);
							setSelectedImage(null);
							setImages([]);
							setImagesError(null);
							setSearched(false);
						}}
						placeholder="Código"
						className="w-full"
					/>

					<div className="pt-2">
						<h3 className="mb-2 text-sm font-semibold text-foreground">Imágenes encontradas</h3>
						{!nameCode ? (
							<div className="text-sm text-muted-foreground">
								Ingresá un código para ver imágenes.
							</div>
						) : imagesLoading ? (
							<div className="text-sm text-muted-foreground">Cargando imágenes...</div>
						) : imagesError ? (
							<div className="text-sm text-destructive">Error: {imagesError}</div>
						) : images.length === 0 && searched ? (
							<div className="text-sm text-muted-foreground">
								No se encontraron imagenes para el código.
							</div>
						) : (
							<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
								{images.map((img) => (
									<button
										key={img.id}
										onClick={() => img.image_url && setSelectedImage(img.image_url)}
										className="aspect-video overflow-hidden rounded border border-border bg-muted p-0 shadow-sm"
									>
										{img.image_url ? (
											<img
												src={img.image_url}
												alt={`Imagen ${img.id}`}
												className="h-full w-full object-cover"
												loading="lazy"
											/>
										) : (
											<div className="flex h-full items-center justify-center text-muted-foreground">
												Sin imagen
											</div>
										)}
									</button>
								))}
							</div>
						)}
					</div>

					<label htmlFor="file-upload" className="w-full">
						<div className="w-full cursor-pointer rounded border bg-background px-4 py-2 text-center text-muted-foreground">
							{file ? file.name : 'Elegí una imagen'}
						</div>
						<Input
							id="file-upload"
							type="file"
							onChange={(e) => setFile(e.target.files?.[0] || null)}
							className="hidden"
						/>
					</label>

					<div className="flex gap-2">
						<Button className="flex-1" onClick={handleUpload} disabled={loading}>
							{loading ? 'Subiendo...' : 'Subir imagen'}
						</Button>
						<Button
							className="flex-1"
							variant="outline"
							onClick={handleSearch}
							disabled={loadingSearch}
						>
							{loadingSearch ? 'Buscando...' : 'Buscar'}
						</Button>
					</div>

					{selectedImage && (
						<ImageViewer
							open={!!selectedImage}
							onOpenChange={(v) => !v && setSelectedImage(null)}
							src={selectedImage}
							trash
							onDelete={async () => {
								const res = await authFetch(
									`/api/gallery/delete?code_name=${encodeURIComponent(nameCode)}`,
									{
										method: 'DELETE',
									}
								);
								const data = await res.json();
								if (data.success) {
									toast({ title: 'Imagen eliminada correctamente', variant: 'default' });
									setSelectedImage(null);
									setImages([]);
									setImagesError(null);
								} else {
									toast({
										title: 'Error al eliminar imagen',
										description: data.error || 'Ocurrió un error al eliminar la imagen',
										variant: 'destructive',
									});
								}
							}}
						/>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
