'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { Plus } from 'lucide-react';
import { Module, listModulesForCurrentMonth, deleteModule } from '@/lib/modules/modules';
import { ModuleTable } from '@/components/business/modules/module-table';
import { ModuleFormModal } from '@/components/business/modules/module-form-modal';
import { ModuleDetailsModal } from '@/components/business/modules/module-details-modal';

export function ModuleManagement() {
	const [modules, setModules] = useState<Module[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isDeleting, setIsDeleting] = useState(false);

	const [listModal, setListModal] = useState<{ open: boolean; module: Module | null }>({
		open: false,
		module: null,
	});
	const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; module: Module | null }>({
		open: false,
		module: null,
	});
	const [createOpen, setCreateOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [editingModule, setEditingModule] = useState<Module | null>(null);

	const loadModules = useCallback(async () => {
		setIsLoading(true);
		const { data, error } = await listModulesForCurrentMonth();
		if (error) {
			console.error('Error cargando módulos:', error);
			toast({
				variant: 'destructive',
				title: 'Error al cargar módulos',
				description: translateError(error),
			});
		}
		setModules(data ?? []);
		setIsLoading(false);
	}, []);

	useEffect(() => {
		loadModules();
	}, [loadModules]);

	const handleEdit = (module: Module) => {
		setListModal({ open: false, module: null });
		setEditingModule(module);
		setEditOpen(true);
	};

	const handleDelete = (module: Module) => {
		setDeleteConfirm({ open: true, module });
	};

	const confirmDelete = async () => {
		if (!deleteConfirm.module) return;
		setIsDeleting(true);
		const { error } = await deleteModule(deleteConfirm.module.id);
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al eliminar el módulo',
				description: translateError(error) || 'Ocurrió un error al eliminar el módulo.',
			});
		} else {
			toast({
				title: 'Módulo eliminado',
				description: 'El módulo y sus archivos fueron eliminados.',
			});
			setDeleteConfirm({ open: false, module: null });
			setListModal({ open: false, module: null });
			loadModules();
		}
		setIsDeleting(false);
	};

	const handleSaved = () => {
		setCreateOpen(false);
		setEditOpen(false);
		setEditingModule(null);
		loadModules();
	};

	return (
		<div className="flex flex-col gap-4 min-w-0">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<h2 className="text-lg mt-5 font-semibold">Módulos del mes actual</h2>
					<p className="text-sm text-muted-foreground">
						{modules.length} módulo(s) registrado(s) este mes.
					</p>
				</div>

				<Button
					size="sm"
					className="min-w-0 w-full sm:w-auto gap-2"
					onClick={() => setCreateOpen(true)}
				>
					<Plus className="h-4 w-4 shrink-0" />
					<span>Nuevo módulo</span>
				</Button>
			</div>

			<ModuleTable
				modules={modules}
				isLoading={isLoading}
				onRowClick={(module) => setListModal({ open: true, module })}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>

			<ModuleFormModal open={createOpen} onOpenChange={setCreateOpen} onCreated={handleSaved} />

			<ModuleFormModal
				open={editOpen}
				onOpenChange={setEditOpen}
				moduleToEdit={editingModule}
				onCreated={handleSaved}
			/>

			<ModuleDetailsModal
				open={listModal.open}
				onOpenChange={(open) => setListModal((prev) => ({ ...prev, open }))}
				module={listModal.module}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>

			<ConfirmDialog
				open={deleteConfirm.open}
				onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
				title="Eliminar módulo"
				description="¿Estás seguro de que quieres eliminar este módulo y todos sus archivos? Esta acción no se puede deshacer."
				confirmText="Eliminar"
				onConfirm={confirmDelete}
				isLoading={isDeleting}
			/>
		</div>
	);
}
