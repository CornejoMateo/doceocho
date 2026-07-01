'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ItemsPredefined } from '@/lib/checklists/items-predefined';
import { Material, deleteMaterial } from '@/lib/checklists/materials';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { MaterialsTab } from '@/components/business/works/checklists/items-predefined-materials-tab';
import { ItemsTab } from '@/components/business/works/checklists/items-predefined-items-tab';

interface ItemsPredefinedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	materials: Material[];
	itemsPredefined: ItemsPredefined[];
	refreshMaterials: () => Promise<void>;
	refreshItemsPredefined: () => Promise<void>;
	isLoading?: boolean;
}

export function ItemsPredefinedDialog({
	open,
	onOpenChange,
	materials,
	itemsPredefined,
	refreshMaterials,
	refreshItemsPredefined,
	isLoading,
}: ItemsPredefinedDialogProps) {
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const selectedMaterial = materials.find((m) => m.id === deleteId);

	const handleDelete = async () => {
		if (!deleteId) return;

		try {
			setIsDeleting(true);

			const { error } = await deleteMaterial(deleteId);
			if (error) throw error;

			await Promise.all([refreshMaterials(), refreshItemsPredefined()]);

			toast({
				title: 'Material eliminado',
				description: 'El material fue eliminado correctamente.',
			});

			setDeleteId(null);
		} catch (error) {
			console.error(error);
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo eliminar el material.',
				variant: 'destructive',
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="mt-5">Configuración de materiales</DialogTitle>

					<DialogDescription>
						Gestiona los materiales y sus items predefinidos que se cargan automáticamente al crear
						una checklist.
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<p className="text-muted-foreground">Cargando...</p>
					</div>
				) : (
					<Tabs defaultValue="materials">
						<TabsList className="w-full">
							<TabsTrigger value="materials" className="flex-1">
								Materiales
							</TabsTrigger>
							<TabsTrigger value="items" className="flex-1">
								Items predefinidos
							</TabsTrigger>
						</TabsList>

						<TabsContent value="materials">
							<MaterialsTab
								materials={materials}
								onRefreshMaterials={refreshMaterials}
								onDeleteRequest={setDeleteId}
							/>
						</TabsContent>

						<TabsContent value="items">
							<ItemsTab
								materials={materials}
								itemsPredefined={itemsPredefined}
								onRefreshItemsPredefined={refreshItemsPredefined}
							/>
						</TabsContent>
					</Tabs>
				)}
			</DialogContent>

			<AlertDialog
				open={deleteId !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteId(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Eliminar material</AlertDialogTitle>

						<AlertDialogDescription>
							¿Estás seguro de que deseas eliminar el material{' '}
							<strong>{selectedMaterial?.name}</strong>? También se eliminarán sus items
							predefinidos. Esta acción no se puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>

						<AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}
