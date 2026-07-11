import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/utils/formats-money';
import { formatCreatedAt } from '@/utils/format-date';
import type { SupplyCardProps } from './types';

export function SupplyCard({
	item,
	isAuthorized,
	onEdit,
	onDelete,
	onQuantityChange,
	onImageView,
	imageLoading,
}: SupplyCardProps) {
	return (
		<div
			className={`p-4 rounded-lg border ${
				item.supply_quantity === 0 ? 'bg-red-300 border-red-400' : 'bg-card border-border'
			}`}
		>
			{/* Header with code and quantity */}
			<div className="flex items-start justify-between mb-3">
				<div className="flex-1 min-w-0">
					<h3 className="font-semibold text-foreground text-lg truncate">
						{item.supply_code || 'Sin código'}
					</h3>
					<p className="text-sm text-muted-foreground truncate">
						{item.supply_line || '-'} {item.supply_brand && `• ${item.supply_brand}`}
					</p>
				</div>
				<div className="ml-3 flex flex-col items-end gap-1">
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => onQuantityChange(item.id, 'decrease', item.supply_quantity || 0)}
						>
							<Minus className="h-3 w-3" />
						</Button>
						<span className="text-lg font-bold text-foreground min-w-[2rem] text-center">
							{item.supply_quantity ?? 0}
						</span>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() => onQuantityChange(item.id, 'increase', item.supply_quantity || 0)}
						>
							<Plus className="h-3 w-3" />
						</Button>
					</div>
					{item.supply_quantity === 0 && (
						<span className="text-xs text-red-600 font-medium">Sin stock</span>
					)}
				</div>
			</div>

			{/* Details */}
			<div className="space-y-2 text-sm">
				{item.supply_description && (
					<div>
						<p className="text-muted-foreground text-xs">Descripción</p>
						<p className="text-foreground break-words">{item.supply_description}</p>
					</div>
				)}
				<div className="grid grid-cols-2 gap-2">
					{item.supply_category && (
						<div>
							<p className="text-muted-foreground text-xs">Categoría</p>
							<p className="text-foreground truncate">{item.supply_category}</p>
						</div>
					)}
					{item.supply_color && (
						<div>
							<p className="text-muted-foreground text-xs">Color</p>
							<p className="text-foreground truncate">{item.supply_color}</p>
						</div>
					)}
					{item.supply_site && (
						<div>
							<p className="text-muted-foreground text-xs">Ubicación</p>
							<p className="text-foreground truncate">{item.supply_site}</p>
						</div>
					)}
					{item.created_at && (
						<div>
							<p className="text-muted-foreground text-xs">Fecha</p>
							<p className="text-foreground truncate">{formatCreatedAt(item.created_at)}</p>
						</div>
					)}
				</div>
				{isAuthorized && item.supply_price && (
					<div>
						<p className="text-muted-foreground text-xs">Precio</p>
						<p className="text-foreground font-medium">{formatCurrency(item.supply_price)}</p>
					</div>
				)}
				<div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
					<div>
						<p className="text-muted-foreground text-xs">Cant. x bulto</p>
						<p className="text-foreground">{item.supply_quantity_for_lump ?? 0}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Bultos</p>
						<p className="text-foreground">{item.supply_quantity_lump ?? 0}</p>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
				{item.image_id ? (
					<button
						type="button"
						onClick={() => onImageView(item)}
						disabled={imageLoading}
						className="flex items-center gap-2 text-sm text-primary hover:underline"
					>
						Ver imagen
					</button>
				) : (
					<span className="text-sm text-muted-foreground">Sin imagen</span>
				)}
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm" onClick={() => onEdit(item.id)}>
						<Edit className="h-4 w-4 mr-1" />
						Editar
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="ghost" size="sm" className="text-destructive">
								<Trash2 className="h-4 w-4" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Eliminar insumo</AlertDialogTitle>
								<AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<AlertDialogAction onClick={() => onDelete(item.id)}>Eliminar</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}
