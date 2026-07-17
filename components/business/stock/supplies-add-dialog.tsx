'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { STOCK_CONFIGS } from '@/lib/stock/stock-config';
import { toast } from '@/components/ui/use-toast';
import { type SupplyItemStock } from '@/lib/stock/supplies-stock';
import { useAuth } from '@/components/provider/auth-provider';
import { formatCurrencyWithoutSymbol, formatNumber, parseArsToNumber } from '@/utils/formats-money';

type FormData = {
	category: string;
	line: string;
	brand: string;
	code: string;
	description: string;
	color: string;
	quantityPerLump: number | '';
	lumpCount: number | '';
	quantity: number | '';
	site: string;
	price: string;
};

interface SupplyFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (item: Partial<SupplyItemStock>) => void;
	materialType?: 'Aluminio' | 'PVC';
	editItem?: SupplyItemStock | null;
	triggerButton?: boolean;
}

export function SupplyFormDialog({
	open,
	onOpenChange,
	onSave,
	materialType = 'Aluminio',
	editItem = null,
	triggerButton = true,
}: SupplyFormDialogProps) {
	const isEditing = !!editItem;
	const config = STOCK_CONFIGS.Insumos;

	const [formData, setFormData] = useState<FormData>({
		category: '',
		line: '',
		brand: '',
		code: '',
		description: '',
		color: '',
		quantityPerLump: '',
		lumpCount: '',
		quantity: '',
		site: '',
		price: '',
	});

	const [showQuantityDialog, setShowQuantityDialog] = useState(false);
	const [quantityDialogType, setQuantityDialogType] = useState<'increase' | 'decrease' | null>(
		null
	);
	const [quantityChange, setQuantityChange] = useState<number | ''>('');
	const [changeQuantityFlag, setChangeQuantityFlag] = useState(false);

	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	useEffect(() => {
		if (editItem) {
			setFormData({
				category: editItem.supply_category || '',
				line: editItem.supply_line || '',
				brand: editItem.supply_brand || '',
				code: editItem.supply_code || '',
				description: editItem.supply_description || '',
				color: editItem.supply_color || '',
				quantityPerLump: editItem.supply_quantity_for_lump ?? '',
				lumpCount: editItem.supply_quantity_lump ?? '',
				quantity: editItem.supply_quantity ?? '',
				site: editItem.supply_site || '',
				price:
					editItem.supply_price !== undefined && editItem.supply_price !== null
						? formatCurrencyWithoutSymbol(editItem.supply_price)
						: '',
			});
		} else {
			resetForm();
		}
	}, [editItem]);

	useEffect(() => {
		if (formData.quantityPerLump !== '' && formData.lumpCount !== '' && changeQuantityFlag) {
			updateField('quantity', Number(formData.quantityPerLump) * Number(formData.lumpCount));
		}
	}, [formData.quantityPerLump, formData.lumpCount, changeQuantityFlag]);

	const resetForm = () => {
		setFormData({
			category: '',
			line: '',
			brand: '',
			code: '',
			description: '',
			color: '',
			quantityPerLump: '',
			lumpCount: '',
			quantity: '',
			site: '',
			price: '',
		});
		setChangeQuantityFlag(false);
	};

	const handleQuantityAdjustment = () => {
		if (quantityChange === '') return;

		const currentTotal = (formData.quantity as number) || 0;
		const adjustment = Number(quantityChange);

		if (quantityDialogType === 'decrease') {
			if (adjustment > currentTotal) {
				toast({
					title: 'Error',
					description: 'No puede disminuir más que la cantidad total actual',
					variant: 'destructive',
					duration: 3000,
				});
				return;
			}
			if (adjustment < 0) {
				toast({
					title: 'Error',
					description: 'La cantidad a disminuir debe ser positiva',
					variant: 'destructive',
					duration: 3000,
				});
				return;
			}
		}

		if (quantityDialogType === 'increase' && adjustment < 0) {
			toast({
				title: 'Error',
				description: 'La cantidad a aumentar debe ser positiva',
				variant: 'destructive',
				duration: 3000,
			});
			return;
		}

		const newTotal =
			quantityDialogType === 'increase' ? currentTotal + adjustment : currentTotal - adjustment;

		if (newTotal < 0) {
			toast({
				title: 'Error',
				description: 'La cantidad total no puede ser negativa',
				variant: 'destructive',
				duration: 3000,
			});
			return;
		}

		updateField('quantity', newTotal);
		onSave({
			supply_quantity: newTotal,
		});
		setShowQuantityDialog(false);
		setQuantityChange('');
		setQuantityDialogType(null);
	};

	const handleSave = () => {
		if (
			!formData.category ||
			!formData.code ||
			formData.quantityPerLump === '' ||
			formData.lumpCount === '' ||
			formData.quantity === ''
		) {
			toast({
				title: 'Error de validación',
				description: 'Complete todos los campos obligatorios',
				variant: 'destructive',
				duration: 4000,
			});
			return;
		}

		if (formData.quantityPerLump < 0 || formData.lumpCount < 0 || formData.quantity < 0) {
			toast({
				title: 'Error de validación',
				description: 'Las cantidades no pueden ser negativas',
				variant: 'destructive',
				duration: 4000,
			});
			return;
		}

		const payload: Partial<SupplyItemStock> = {
			created_at:
				isEditing && editItem?.created_at
					? editItem.created_at
					: new Date().toISOString().split('T')[0],
			supply_material: isEditing ? editItem?.supply_material || materialType : materialType,
			supply_category: formData.category,
			supply_line: formData.line,
			supply_brand: formData.brand,
			supply_code: formData.code,
			supply_description: formData.description,
			supply_color: formData.color,
			supply_quantity_for_lump: Number(formData.quantityPerLump),
			supply_quantity_lump: Number(formData.lumpCount),
			supply_quantity: Number(formData.quantity),
			supply_site: formData.site,
			supply_price: formData.price === '' ? null : parseArsToNumber(formData.price),
		};

		onSave(payload);
		setChangeQuantityFlag(false);
		toast({
			title: isEditing ? 'Ítem actualizado' : 'Ítem agregado',
			description: `El ${config.title.slice(0, -1).toLowerCase()} ha sido ${isEditing ? 'actualizado' : 'agregado'} exitosamente`,
		});
		if (!isEditing) resetForm();
		onOpenChange(false);
	};

	const updateField = (field: keyof FormData, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{triggerButton && (
				<DialogTrigger asChild>
					<Button className="gap-2">
						<Plus className="h-4 w-4" />
						Agregar insumo
					</Button>
				</DialogTrigger>
			)}
			<DialogContent showCloseButton={false} className="bg-card max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Editar insumo' : 'Agregar insumo'}</DialogTitle>
					<DialogDescription>
						{isEditing ? 'Modifique los datos' : 'Complete los datos del nuevo insumo'}
					</DialogDescription>
				</DialogHeader>
				<div className="overflow-y-auto flex-1 py-4 pr-2 -mr-2">
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="category">Categoría</Label>
							<Input
								id="category"
								value={formData.category}
								onChange={(e) => updateField('category', e.target.value)}
								className="bg-background"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="line">Línea</Label>
							<Input
								id="line"
								value={formData.line}
								onChange={(e) => updateField('line', e.target.value)}
								placeholder="Ingrese la línea"
								className="bg-background"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="brand">Marca</Label>
							<Input
								id="brand"
								value={formData.brand}
								onChange={(e) => updateField('brand', e.target.value)}
								placeholder="Ingrese la marca"
								className="bg-background"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="code">Código</Label>
							<Input
								id="code"
								value={formData.code}
								onChange={(e) => updateField('code', e.target.value)}
								placeholder="Ingrese el código"
								className="bg-background"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">Descripción</Label>
							<Input
								id="description"
								value={formData.description}
								onChange={(e) => updateField('description', e.target.value)}
								className="bg-background"
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="color">Color</Label>
							<Input
								id="color"
								value={formData.color}
								onChange={(e) => updateField('color', e.target.value)}
								placeholder="Ingrese el color"
								className="bg-background"
							/>
						</div>

						<div className="grid gap-2 md:grid-cols-3">
							<div className="grid gap-2">
								<Label htmlFor="quantityPerLump">Cantidad x bulto</Label>
								<Input
									id="quantityPerLump"
									type="number"
									value={formData.quantityPerLump}
									onChange={(e) => {
										updateField('quantityPerLump', e.target.value ? Number(e.target.value) : '');
										setChangeQuantityFlag(true);
									}}
									className="bg-background"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="lumpCount">Cantidad de bultos</Label>
								<Input
									id="lumpCount"
									type="number"
									value={formData.lumpCount}
									onChange={(e) => {
										updateField('lumpCount', e.target.value ? Number(e.target.value) : '');
										setChangeQuantityFlag(true);
									}}
									className="bg-background"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="quantity">Cantidad total</Label>
								<Input
									id="quantity"
									type="number"
									value={formData.quantity}
									onChange={(e) =>
										updateField('quantity', e.target.value ? Number(e.target.value) : '')
									}
									className="bg-background"
								/>
							</div>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="site">Ubicación</Label>
							<Input
								id="site"
								value={formData.site}
								onChange={(e) => updateField('site', e.target.value)}
								placeholder="Ingrese la ubicación"
								className="bg-background"
							/>
						</div>

						{isAuthorized && (
							<div className="grid gap-2">
								<Label htmlFor="price">Precio (opcional)</Label>
								<Input
									id="price"
									type="text"
									value={formData.price}
									onChange={(e) =>
										updateField('price', e.target.value ? formatNumber(e.target.value) : '')
									}
									className="bg-background"
								/>
							</div>
						)}
					</div>
				</div>
				<DialogFooter className="pt-4 border-t border-border">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button onClick={handleSave}>{isEditing ? 'Guardar cambios' : 'Guardar'}</Button>
				</DialogFooter>
			</DialogContent>
			<Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{quantityDialogType === 'increase' ? 'Aumentar cantidad' : 'Disminuir cantidad'}
						</DialogTitle>
						<DialogDescription>
							{quantityDialogType === 'increase'
								? '¿Cuántas unidades desea aumentar?'
								: '¿Cuántas unidades desea disminuir?'}
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Input
							type="number"
							value={quantityChange as any}
							onChange={(e) => setQuantityChange(e.target.value ? Number(e.target.value) : '')}
							placeholder="Ingrese la cantidad"
							className="bg-background"
							min="0"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowQuantityDialog(false)}>
							Cancelar
						</Button>
						<Button onClick={handleQuantityAdjustment}>
							{quantityDialogType === 'increase' ? 'Aumentar' : 'Disminuir'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Dialog>
	);
}
