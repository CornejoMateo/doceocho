'use client';

import { useMemo, useState } from 'react';
import { Image } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { PhotoGalleryModal } from './images/photo-gallery-modal';
import { SupplyFormDialog } from '@/components/business/stock/supplies-add-dialog';
import { StockFilters } from '@/components/business/stock/stock-filters';
import { StockStats } from '@/components/business/stock/stock-stats';
import { SuppliesTable } from './stock-tables';
import { filterStockItems } from '@/components/business/stock/stock-filters-logic';
import { STOCK_ADAPTERS } from '@/lib/stock/adapters';
import { STOCK_CONFIGS } from '@/lib/stock/stock-config';
import { getDescription, getTitle } from '@/helpers/stock/stock-management';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

export function StockManagement() {
	const adapter = STOCK_ADAPTERS.Insumos;
	const tableName = STOCK_CONFIGS.Insumos.tableName;
	const fetcher = () => adapter.fetch();

	const {
		data: stock,
		loading,
		error,
	} = useOptimizedRealtime<any>(tableName, fetcher, 'realtime_supplies');

	const [searchTerm, setSearchTerm] = useState('');
	const [showOutOfStock, setShowOutOfStock] = useState(false);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<any | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
	const itemsPerPage = 10;

	const filteredStock = useMemo(() => {
		let result = filterStockItems(stock, searchTerm, undefined);
		if (showOutOfStock) {
			result = result.filter((item: any) => adapter.getQuantity(item) === 0);
		}
		return result;
	}, [stock, searchTerm, showOutOfStock, adapter]);

	const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
	const currentItems = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredStock.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredStock, currentPage]);

	const totalItems = stock?.length || 0;

	const lastAddedItem = [...(stock || [])].sort(
		(a: any, b: any) =>
			new Date(b.created_at || b.last_update || 0).getTime() -
			new Date(a.created_at || a.last_update || 0).getTime()
	)[0];

	const handleEdit = (id: number) => {
		const item = stock.find((entry: any) => entry.id === id);
		if (item) {
			setEditingItem(item);
			setIsEditDialogOpen(true);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-balance text-2xl font-bold text-foreground">
						{getTitle('Insumos', 'Aluminio')}
					</h2>
					<p className="mt-1 text-muted-foreground">{getDescription('Insumos', 'Aluminio')}</p>
				</div>

				<div className="flex gap-2">
					<Button variant="default" onClick={() => setIsPhotoGalleryOpen(true)} className="gap-2">
						<Image className="h-5 w-5" />
						Galería
					</Button>

					<PhotoGalleryModal open={isPhotoGalleryOpen} onOpenChange={setIsPhotoGalleryOpen} />

					<SupplyFormDialog
						open={isAddDialogOpen}
						onOpenChange={setIsAddDialogOpen}
						onSave={async (newItem) => {
							try {
								const result = await adapter.create(newItem);
								if (result?.error) {
									const errorMessage = translateError(result.error);
									toast({
										title: 'Error',
										description: errorMessage || 'No se pudo crear el insumo. Intenta nuevamente.',
										variant: 'destructive',
									});
									return;
								}
								setIsAddDialogOpen(false);
							} catch (error) {
								console.error('Error al crear:', error);
								const errorMessage = translateError(error);
								toast({
									title: 'Error',
									description: errorMessage || 'No se pudo crear el insumo. Intenta nuevamente.',
									variant: 'destructive',
								});
							}
						}}
						triggerButton
					/>
				</div>
			</div>

			<StockStats totalItems={totalItems} lastAddedItem={lastAddedItem} />

			<StockFilters
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				showOutOfStock={showOutOfStock}
				setShowOutOfStock={setShowOutOfStock}
			/>

			{loading ? (
				<p>Cargando stock...</p>
			) : error ? (
				<p className="text-destructive">Error: {String(error)}</p>
			) : (
				<>
					<SuppliesTable
						filteredStock={currentItems}
						onEdit={handleEdit}
						onDelete={async (id) => {
							try {
								const result = await adapter.remove(id);
								if (result?.error) {
									const errorMessage = translateError(result.error);
									toast({
										title: 'Error',
										description:
											errorMessage || 'No se pudo eliminar el insumo. Intenta nuevamente.',
										variant: 'destructive',
									});
									return;
								}
								toast({
									title: 'Insumo eliminado',
									description: 'El insumo ha sido eliminado correctamente.',
								});
							} catch (error) {
								const errorMessage = translateError(error);
								toast({
									title: 'Error',
									description: errorMessage || 'No se pudo eliminar el insumo. Intenta nuevamente.',
									variant: 'destructive',
								});
							}
						}}
						onUpdateQuantity={async (id, newQuantity) => {
							if (newQuantity < 0) return;
							try {
								const result = await adapter.updateQuantity(id, newQuantity);
								if (result?.error) {
									const errorMessage = translateError(result.error);
									toast({
										title: 'Error',
										description:
											errorMessage || 'No se pudo actualizar la cantidad. Intenta nuevamente.',
										variant: 'destructive',
									});
								}
							} catch (error) {
								const errorMessage = translateError(error);
								toast({
									title: 'Error',
									description:
										errorMessage || 'No se pudo actualizar la cantidad. Intenta nuevamente.',
									variant: 'destructive',
								});
							}
						}}
					/>

					{isEditDialogOpen && editingItem && (
						<SupplyFormDialog
							open={isEditDialogOpen}
							onOpenChange={setIsEditDialogOpen}
							editItem={editingItem}
							onSave={async (changes) => {
								try {
									const result = await adapter.update(editingItem.id, changes);
									if (result?.error) {
										const errorMessage = translateError(result.error);
										toast({
											title: 'Error',
											description:
												errorMessage || 'No se pudo actualizar el insumo. Intenta nuevamente.',
											variant: 'destructive',
										});
										return;
									}
									setIsEditDialogOpen(false);
								} catch (error) {
									const errorMessage = translateError(error);
									toast({
										title: 'Error',
										description:
											errorMessage || 'No se pudo actualizar el insumo. Intenta nuevamente.',
										variant: 'destructive',
									});
								}
							}}
						/>
					)}

					{filteredStock.length > itemsPerPage && (
						<div className="mt-4 flex items-center justify-between px-2">
							<div className="text-sm text-muted-foreground">
								Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredStock.length)}-
								{Math.min(currentPage * itemsPerPage, filteredStock.length)} de{' '}
								{filteredStock.length} elementos
							</div>

							<Pagination className="mx-0 w-auto">
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
											className={
												currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
											}
										/>
									</PaginationItem>

									{Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
										let pageNum = index + 1;
										if (totalPages > 5) {
											if (currentPage <= 3) pageNum = index + 1;
											else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + index;
											else pageNum = currentPage - 2 + index;
										}
										return (
											<PaginationItem key={pageNum}>
												<PaginationLink
													isActive={currentPage === pageNum}
													className="cursor-pointer"
													onClick={() => setCurrentPage(pageNum)}
												>
													{pageNum}
												</PaginationLink>
											</PaginationItem>
										);
									})}

									<PaginationItem>
										<PaginationNext
											onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
											className={
												currentPage === totalPages
													? 'pointer-events-none opacity-50'
													: 'cursor-pointer'
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					)}
				</>
			)}
		</div>
	);
}
