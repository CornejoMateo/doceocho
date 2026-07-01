'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { Checklist, getItemsByChecklistId } from '@/lib/checklists/checklists';
import { getItemsPredefinedByMaterialId } from '@/lib/checklists/items-predefined';
import { listMaterials } from '@/lib/checklists/materials';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { translateError } from '@/lib/error-translator';
import { useChecklistModal } from '@/hooks/clients/use-checklist-modal';
import { Material } from '@/lib/checklists/materials';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

type ChecklistModalProps = {
	workId: number;
	existingChecklists?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	checklistToEdit?: Checklist | null;
	onSave: (checklist: {
		name?: string | null;
		description?: string | null;
		items: Array<{ description: string }>;
		width?: number | null;
		height?: number | null;
		depth?: string | null;
		type_furniture?: string | null;
	}) => Promise<void>;
	onUpdate?: (
		checklistId: number,
		checklist: {
			name?: string | null;
			description?: string | null;
			items: Array<{ description: string }>;
			width?: number | null;
			height?: number | null;
			depth?: string | null;
			type_furniture?: string | null;
		}
	) => Promise<void>;
};

export function ChecklistModal({
	open,
	onOpenChange,
	checklistToEdit,
	onSave,
	onUpdate,
}: ChecklistModalProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [createdCount, setCreatedCount] = useState(0);
	const [isCreating, setIsCreating] = useState(false);
	const [isLoadingItems, setIsLoadingItems] = useState(false);
	const [materials, setMaterials] = useState<Material[]>([]);
	const [error, setError] = useState<string | null>(null);

	const isEditMode = !!checklistToEdit; // true if checklistToEdit is provided, false for create mode
	const isControlled = open !== undefined;
	const modalOpen = isControlled ? open : isOpen;
	const setModalOpen = isControlled ? onOpenChange || (() => {}) : setIsOpen;

	// Reset when modal opens/closes
	useEffect(() => {
		if (modalOpen) {
			listMaterials().then(({ data }) => {
				if (data) setMaterials([...data, { id: -1, name: 'Otros' }]);
			});
		} else {
			setCreatedCount(0);
			setError(null);
			setMaterials([]);
			if (!isEditMode) {
				resetForm();
			}
		}
	}, [modalOpen, isEditMode]);

	useEffect(() => {
		if (isEditMode && checklistToEdit) {
			getItemsByChecklistId(checklistToEdit.id).then(({ data }) => {
				initializeChecklist(checklistToEdit, data ?? undefined);
			});
		}
	}, [checklistToEdit, isEditMode]);

	const {
		checklist,
		resetForm,
		updateField,
		addItem,
		removeItem,
		updateItem,
		setItems,
		initializeChecklist,
	} = useChecklistModal();

	const prevMaterialRef = useRef<string | null | undefined>(undefined);

	useEffect(() => {
		if (isEditMode) return;

		const currentMaterial = checklist.type_furniture;
		const prevMaterial = prevMaterialRef.current;
		prevMaterialRef.current = currentMaterial;

		if (prevMaterial === undefined || !currentMaterial) return;

		setIsLoadingItems(true);

		(async () => {
			const { data: materials } = await listMaterials();
			const material = materials?.find(
				(m) => m.name.toLowerCase() === currentMaterial.toLowerCase()
			);
			if (!material) {
				setItems([]);
				setIsLoadingItems(false);
				return;
			}

			const { data } = await getItemsPredefinedByMaterialId(material.id);
			setItems(
				data && data.items.length > 0
					? data.items.map((desc: string) => ({ description: desc }))
					: []
			);
			setIsLoadingItems(false);
		})();
	}, [checklist.type_furniture, isEditMode]);

	const handleSaveAndNext = async () => {
		setIsCreating(true);
		setError(null);

		try {
			if (isEditMode && onUpdate && checklistToEdit) {
				await onUpdate(checklistToEdit.id, checklist);
				toast({
					title: 'Checklist actualizada',
					description: 'Los cambios se guardaron correctamente.',
				});
				setModalOpen(false);
			} else {
				// Create mode
				await onSave(checklist);
				setCreatedCount((prev) => prev + 1);
				toast({
					title: 'Checklist creada',
					description: `Checklist ${createdCount + 1} creada exitosamente.`,
				});
				resetForm();
			}
		} catch (err: any) {
			const errorMessage = translateError(err);
			setError(errorMessage);
			toast({
				title: 'Error',
				description: errorMessage,
				variant: 'destructive',
			});
		} finally {
			setIsCreating(false);
		}
	};

	const handleFinish = () => {
		if (createdCount > 0) {
			toast({
				title: 'Proceso completado',
				description: `Se crearon ${createdCount} checklist(s) exitosamente.`,
			});
		}
		setModalOpen(false);
	};

	return (
		<Dialog open={modalOpen} onOpenChange={setModalOpen}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
				<DialogHeader>
					<div className="flex items-center justify-between pt-4">
						<DialogTitle>{isEditMode ? 'Editar Checklist' : 'Crear Checklist'}</DialogTitle>
						{!isEditMode && createdCount > 0 && (
							<Badge variant="default" className="gap-1">
								<CheckCircle className="h-3 w-3" />
								{createdCount} creada(s)
							</Badge>
						)}
					</div>
					<DialogDescription className="sr-only">
						{isEditMode
							? 'Modifica los detalles del checklist.'
							: 'Completa los campos para crear un nuevo checklist.'}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{error && (
						<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					<Card className="border-2 shadow-sm">
						<CardHeader className="pb-6 space-y-4">
							<div className="text-center">
								<h3 className="text-xl font-semibold text-muted-foreground mb-2">
									{isEditMode ? 'Editar' : `Checklist ${createdCount + 1}`}
								</h3>
								<Input
									placeholder="Identificador"
									value={checklist.name || ''}
									onChange={(e) => updateField('name', e.target.value)}
									className="text-center border-0 shadow-none focus-visible:ring-1 bg-muted/30"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="description" className="text-sm">
										Descripción
									</Label>
									<Input
										id="description"
										placeholder="Descripción (opcional)"
										value={checklist.description || ''}
										onChange={(e) => updateField('description', e.target.value)}
										className="h-10"
									/>
								</div>

								<div className="space-y-4">
									<Label>Material</Label>
									<Select
										value={checklist.type_furniture || ''}
										onValueChange={(value) => updateField('type_furniture', value)}
									>
										<SelectTrigger className="w-full h-10">
											<SelectValue placeholder="Seleccionar tipo" />
										</SelectTrigger>
										<SelectContent>
											{materials.length === 0 ? (
												<SelectItem value="no-materials" disabled>
													No hay materiales
												</SelectItem>
											) : (
												materials.map((m) => (
													<SelectItem key={m.id} value={m.name}>
														{m.name}
													</SelectItem>
												))
											)}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor="width" className="text-sm">
										Ancho (cm)
									</Label>
									<Input
										id="width"
										type="number"
										placeholder="0"
										value={checklist.width ?? ''}
										onChange={(e) =>
											updateField('width', e.target.value ? Number(e.target.value) : null)
										}
										className="h-10"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="height" className="text-sm">
										Alto (cm)
									</Label>
									<Input
										id="height"
										type="number"
										placeholder="0"
										value={checklist.height ?? ''}
										onChange={(e) =>
											updateField('height', e.target.value ? Number(e.target.value) : null)
										}
										className="h-10"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="depth" className="text-sm">
										Profundidad
									</Label>
									<Input
										id="depth"
										type="number"
										placeholder="0"
										value={checklist.depth ?? ''}
										onChange={(e) =>
											updateField('depth', e.target.value ? Number(e.target.value) : null)
										}
										className="h-10"
									/>
								</div>
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							<div className="space-y-4">
								<h4 className="font-medium text-center text-muted-foreground">
									Items de Checklist
								</h4>

								{isLoadingItems ? (
									<div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" />
										<span className="text-sm">Cargando items...</span>
									</div>
								) : (
									<>
										<div className="space-y-3 max-h-48 overflow-y-auto">
											{checklist.items.map((item, itemIndex) => (
												<div
													key={itemIndex}
													className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border"
												>
													<Input
														value={item.description}
														onChange={(e) => updateItem(itemIndex, e.target.value)}
														className="flex-1 border-0 bg-transparent focus-visible:ring-1 text-sm h-8"
													/>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => removeItem(itemIndex)}
														className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>

										<div className="flex items-center gap-3 p-3 border-2 border-dashed border-muted rounded-lg">
											<Input
												placeholder="Agregar nuevo item..."
												onKeyDown={(e) => {
													if (e.key === 'Enter') {
														e.preventDefault();
														const target = e.target as HTMLInputElement;
														addItem(target.value);
														target.value = '';
													}
												}}
												className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-sm"
											/>
											<Button
												type="button"
												onClick={(e) => {
													const input = e.currentTarget.parentElement?.querySelector('input');
													if (input) {
														addItem(input.value);
														input.value = '';
													}
												}}
												size="sm"
												className="h-8 w-8 p-0 shrink-0"
											>
												<Plus className="h-4 w-4" />
											</Button>
										</div>
									</>
								)}
							</div>
						</CardContent>
					</Card>

					<div className="flex justify-center space-x-4 pt-4 border-t">
						{isEditMode ? (
							<>
								<Button
									type="button"
									variant="outline"
									onClick={() => setModalOpen(false)}
									className="px-8"
								>
									Cancelar
								</Button>
								<Button onClick={handleSaveAndNext} disabled={isCreating} className="px-8">
									{isCreating ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Guardando...
										</>
									) : (
										'Guardar Cambios'
									)}
								</Button>
							</>
						) : (
							<>
								<Button type="button" variant="outline" onClick={handleFinish} className="px-8">
									Finalizar
								</Button>
								<Button onClick={handleSaveAndNext} disabled={isCreating} className="px-8">
									{isCreating ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Creando...
										</>
									) : (
										<>
											Crear y siguiente
											<Plus className="ml-2 h-4 w-4" />
										</>
									)}
								</Button>
							</>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
