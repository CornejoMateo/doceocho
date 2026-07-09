'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Material, createMaterial, updateMaterial } from '@/lib/checklists/materials';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

interface MaterialsTabProps {
	materials: Material[];
	onRefreshMaterials: () => Promise<void>;
	onDeleteRequest: (id: number) => void;
}

export function MaterialsTab({
	materials,
	onRefreshMaterials,
	onDeleteRequest,
}: MaterialsTabProps) {
	const [materialName, setMaterialName] = useState('');
	const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const resetForm = () => {
		setMaterialName('');
		setEditingMaterialId(null);
	};

	const handleEdit = (material: Material) => {
		setEditingMaterialId(material.id);
		setMaterialName(material.name);
	};

	const handleCancelEdit = () => {
		resetForm();
	};

	const handleAdd = async () => {
		if (!materialName.trim()) {
			toast({
				title: 'Campo requerido',
				description: 'Debes ingresar un nombre para el material.',
				variant: 'destructive',
			});
			return;
		}

		try {
			setIsSaving(true);

			const { data, error } = await createMaterial({ name: materialName.trim() });
			if (error) throw error;

			await onRefreshMaterials();
			setMaterialName('');

			toast({
				title: 'Material creado',
				description: `El material "${materialName.trim()}" fue creado correctamente.`,
			});
		} catch (error) {
			console.error(error);
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo crear el material.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleUpdate = async () => {
		if (editingMaterialId === null) return;
		if (!materialName.trim()) {
			toast({
				title: 'Campo requerido',
				description: 'Debes ingresar un nombre para el material.',
				variant: 'destructive',
			});
			return;
		}

		try {
			setIsSaving(true);

			const { error } = await updateMaterial(editingMaterialId, { name: materialName.trim() });
			if (error) throw error;

			await onRefreshMaterials();
			resetForm();

			toast({
				title: 'Material actualizado',
				description: 'El material fue actualizado correctamente.',
			});
		} catch (error) {
			console.error(error);
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo actualizar el material.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-4 pt-4">
			<div className="space-y-2">
				<Label>{editingMaterialId ? 'Editar material' : 'Agregar material'}</Label>

				<div className="flex items-center gap-2">
					<Input
						value={materialName}
						onChange={(e) => setMaterialName(e.target.value)}
						placeholder="Ej: MDF, Aglomerado, etc."
					/>

					{editingMaterialId ? (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={handleCancelEdit}
								disabled={isSaving}
								className="shrink-0"
							>
								Cancelar
							</Button>
							<Button size="sm" onClick={handleUpdate} disabled={isSaving} className="shrink-0">
								Actualizar
							</Button>
						</>
					) : (
						<Button size="sm" onClick={handleAdd} disabled={isSaving} className="shrink-0">
							<Plus className="h-4 w-4 mr-1" />
							Agregar
						</Button>
					)}
				</div>
			</div>

			<div className="space-y-2 max-h-64 overflow-y-auto">
				{materials.length === 0 ? (
					<p className="text-sm text-center text-muted-foreground py-8">
						No hay materiales configurados.
					</p>
				) : (
					materials.map((material) => (
						<div
							key={material.id}
							className="flex items-center justify-between rounded-lg border p-3"
						>
							<span className="font-medium">{material.name}</span>

							<div className="flex gap-1">
								<Button size="icon" variant="ghost" onClick={() => handleEdit(material)}>
									<Pencil className="h-4 w-4" />
								</Button>

								<Button size="icon" variant="ghost" onClick={() => onDeleteRequest(material.id)}>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
