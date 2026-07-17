import type { SupplyItemStock } from '@/lib/stock/supplies-stock';

export interface SuppliesTableProps {
	filteredStock: SupplyItemStock[];
	onEdit: (id: number) => void;
	onDelete: (id: number) => void;
	onUpdateQuantity: (id: number, newQuantity: number) => Promise<void>;
}

export interface SupplyCardProps {
	item: SupplyItemStock;
	isAuthorized: boolean;
	onEdit: (id: number) => void;
	onDelete: (id: number) => void;
	onQuantityChange: (id: number, type: 'increase' | 'decrease', currentQty: number) => void;
	onImageView: (item: SupplyItemStock) => void;
	imageLoading: boolean;
}
