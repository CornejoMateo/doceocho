'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	ItemsPredefined,
	createItemsPredefined,
	updateItemsPredefined,
} from '@/lib/checklists/items-predefined';
import { Material } from '@/lib/checklists/materials';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

interface ItemsTabProps {
	materials: Material[];
	itemsPredefined: ItemsPredefined[];
	onRefreshItemsPredefined: () => Promise<void>;
}

export function ItemsTab({ materials, itemsPredefined, onRefreshItemsPredefined }: ItemsTabProps) {
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [itemInputs, setItemInputs] = useState<string[]>(['']);
	const [isSaving, setIsSaving] = useState(false);

	const currentPredefined = itemsPredefined.find((r) => r.material_id === selectedId);

	useEffect(() => {
		if (selectedId && currentPredefined) {
			setItemInputs(currentPredefined.items.length > 0 ? [...currentPredefined.items] : ['']);
		} else if (selectedId) {
			setItemInputs(['']);
		}
	}, [selectedId, currentPredefined]);

	const handleAddInput = () => {
		setItemInputs((prev) => [...prev, '']);
	};

	const handleInputChange = (index: number, value: string) => {
		setItemInputs((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	const handleRemoveInput = (index: number) => {
		setItemInputs((prev) => prev.filter((_, i) => i !== index));
	};

	const handleMaterialChange = (value: string) => {
		const id = Number(value);
		setSelectedId(id);

		const predefined = itemsPredefined.find((r) => r.material_id === id);
		setItemInputs(predefined && predefined.items.length > 0 ? [...predefined.items] : ['']);
	};

	const handleSave = async () => {
		if (isSaving || !selectedId) return;

		const items = itemInputs.map((s) => s.trim()).filter((s) => s.length > 0);

		if (items.length === 0) {
			toast({
				title: 'Campo requerido',
				description: 'Debes agregar al menos un item.',
				variant: 'destructive',
			});
			return;
		}

		try {
			setIsSaving(true);

			if (currentPredefined) {
				const { error } = await updateItemsPredefined(currentPredefined.id, {
					material_id: selectedId,
					items,
				});
				if (error) throw error;

				toast({
					title: 'Items actualizados',
					description: 'Los items predefinidos fueron actualizados.',
				});
			} else {
				const { error } = await createItemsPredefined({
					material_id: selectedId,
					items,
				});
				if (error) throw error;

				toast({
					title: 'Items creados',
					description: 'Los items predefinidos fueron creados.',
				});
			}

			await onRefreshItemsPredefined();
		} catch (error) {
			console.error(error);
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron guardar los items predefinidos.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-4 pt-4">
			<div className="space-y-2">
				<Label>Seleccionar material</Label>

				<Select value={selectedId?.toString() || ''} onValueChange={handleMaterialChange}>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Seleccionar material" />
					</SelectTrigger>
					<SelectContent>
						{materials.map((m) => (
							<SelectItem key={m.id} value={m.id.toString()}>
								{m.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{selectedId && (
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label>Items predefinidos</Label>

						<Button type="button" variant="outline" size="sm" onClick={handleAddInput}>
							<Plus className="h-3 w-3 mr-1" />
							Agregar
						</Button>
					</div>

					<div className="space-y-2 max-h-48 overflow-y-auto">
						{itemInputs.map((item, index) => (
							<div key={index} className="flex items-center gap-2">
								<Input
									value={item}
									onChange={(e) => handleInputChange(index, e.target.value)}
									placeholder={`Item ${index + 1}`}
								/>

								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => handleRemoveInput(index)}
									className="text-destructive hover:text-destructive h-8 w-8 p-0 shrink-0"
									disabled={itemInputs.length <= 1}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>

					<Button onClick={handleSave} className="w-full" disabled={isSaving}>
						<Plus className="h-4 w-4 mr-2" />
						{currentPredefined ? 'Actualizar items predefinidos' : 'Guardar items predefinidos'}
					</Button>
				</div>
			)}
		</div>
	);
}
