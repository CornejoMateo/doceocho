import { Package, Edit, Plus, Minus } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/provider/auth-provider';
import ImageViewer from '@/components/ui/image-viewer';
import { formatCurrency } from '@/utils/formats-money';
import { useSupplyDialogs } from '@/hooks/supply/use-supply-dialogs';
import { SupplyCard } from './supply-card';
import { QuantityDialog } from './quantity-dialog';
import { DeleteAlertDialog } from './delete-alert-dialog';
import type { SuppliesTableProps } from './types';
import { formatCreatedAt } from '@/utils/format-date';

export function SuppliesTable({
	filteredStock,
	onEdit,
	onDelete,
	onUpdateQuantity,
}: SuppliesTableProps) {
	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	const {
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
	} = useSupplyDialogs(onUpdateQuantity);

	return (
		<Card className="overflow-hidden border-border bg-card">
			{/* Desktop Table View */}
			<div className="hidden md:block overflow-x-auto">
				<table className="w-full">
					<thead className="border-b border-border bg-secondary">
						<tr>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Categoría
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Línea
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Marca
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Código
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Descripción
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Color
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Cant x bulto
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Bultos
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Total
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Ubicación
							</th>
							{isAuthorized && (
								<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Precio
								</th>
							)}
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Fecha de creación
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Acciones
							</th>
							<th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Imagen
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{filteredStock.length === 0 ? (
							<tr>
								<td colSpan={isAuthorized ? 14 : 13} className="px-6 py-12 text-center">
									<div className="flex flex-col items-center gap-2 text-muted-foreground">
										<Package className="h-12 w-12 opacity-50" />
										<p className="text-lg font-medium">No hay insumos</p>
									</div>
								</td>
							</tr>
						) : (
							filteredStock.map((item) => {
								return (
									<tr
										key={item.id}
										className={
											item.supply_quantity === 0
												? 'bg-red-300'
												: 'transition-colors hover:bg-secondary/50'
										}
									>
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{item.supply_category || '—'}
										</td>
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{item.supply_line || '-'}
										</td>
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{item.supply_brand || '-'}
										</td>
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{item.supply_code || '-'}
										</td>
										<td className="max-w-[200px] sm:max-w-[380px] px-2 py-2 text-sm text-foreground">
											<p className="break-words whitespace-pre-line text-justify truncate">
												{item.supply_description || '-'}
											</p>
										</td>
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{item.supply_color || ''}
										</td>
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{item.supply_quantity_for_lump ?? 0}
										</td>
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{item.supply_quantity_lump ?? 0}
										</td>
										<td className="px-2 py-2 text-center">
											<div className="flex items-center justify-center gap-2">
												<Button
													variant="ghost"
													size="icon"
													onClick={() =>
														openQuantityDialog(item.id, 'decrease', item.supply_quantity || 0)
													}
												>
													<Minus className="h-4 w-4" />
												</Button>
												<span className="text-sm text-foreground">{item.supply_quantity ?? 0}</span>
												<Button
													variant="ghost"
													size="icon"
													onClick={() =>
														openQuantityDialog(item.id, 'increase', item.supply_quantity || 0)
													}
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										</td>
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{item.supply_site || '-'}
										</td>
										{isAuthorized && (
											<td className="px-2 py-2 text-center text-sm text-foreground">
												{formatCurrency(item.supply_price) || '-'}
											</td>
										)}
										<td className="px-2 py-2 text-center text-sm text-foreground">
											{formatCreatedAt(item.created_at) || '-'}
										</td>
										<td className="px-2 py-2 text-center">
											<div className="flex items-center justify-center gap-2">
												<Button variant="ghost" size="icon" onClick={() => onEdit(item.id)}>
													<Edit className="h-4 w-4" />
												</Button>
												<DeleteAlertDialog onDelete={() => onDelete(item.id)} />
											</div>
										</td>
										<td className="px-2 py-2 text-center">
											{item.image_id ? (
												<button
													type="button"
													onClick={() => openImageViewer(item)}
													disabled={imageLoading}
													className="mx-auto block"
												>
													<div className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded bg-muted">
														<span className="text-xs text-foreground hover:cursor-pointer">
															Ver
														</span>
													</div>
												</button>
											) : (
												<div className="text-center text-sm text-foreground">-</div>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* Mobile Card View */}
			<div className="md:hidden space-y-4 p-4">
				{filteredStock.length === 0 ? (
					<div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
						<Package className="h-12 w-12 opacity-50" />
						<p className="text-lg font-medium">No hay insumos</p>
					</div>
				) : (
					filteredStock.map((item) => (
						<SupplyCard
							key={item.id}
							item={item}
							isAuthorized={isAuthorized}
							onEdit={onEdit}
							onDelete={onDelete}
							onQuantityChange={openQuantityDialog}
							onImageView={openImageViewer}
							imageLoading={imageLoading}
						/>
					))
				)}
			</div>

			<QuantityDialog
				open={showQuantityDialog}
				onOpenChange={setShowQuantityDialog}
				dialogType={quantityDialogType}
				quantityChange={quantityChange}
				setQuantityChange={setQuantityChange}
				onConfirm={confirmQuantityUpdate}
			/>

			<ImageViewer
				open={imageViewerOpen}
				onOpenChange={setImageViewerOpen}
				src={selectedImage}
				loading={imageLoading}
				alt="Imagen del insumo"
			/>
		</Card>
	);
}
