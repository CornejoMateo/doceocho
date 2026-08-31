'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { Plus, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
	Module,
	listModulesForCurrentMonth,
	listModulesPendingRejected,
	deleteModule,
	updateModule,
} from '@/lib/modules/modules';
import { ModuleTable } from '@/components/business/modules/module-table';
import { ModuleFormModal } from '@/components/business/modules/module-form-modal';
import { ModuleDetailsModal } from '@/components/business/modules/module-details-modal';
import { LoadMoreModulesModal } from '@/components/business/modules/load-more-modules-modal';
import { useAuth } from '@/components/provider/auth-provider';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { MODULE_STATUSES, ModuleStatus } from '@/constants/modules/module-status';
import { getModuleStatusLabel, getModuleWorkLabel } from '@/helpers/modules/modules-helper';
import { User } from '@/lib/users/users';

export function ModuleManagement({ users = [] }: { users?: User[] }) {
	const [modules, setModules] = useState<Module[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [monthModules, setMonthModules] = useState<Module[]>([]);
	const [isMonthLoading, setIsMonthLoading] = useState(false);
	const [monthOpen, setMonthOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [sendConfirm, setSendConfirm] = useState<{ open: boolean; module: Module | null }>({
		open: false,
		module: null,
	});

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
	const [loadMoreOpen, setLoadMoreOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<ModuleStatus | 'all'>('all');
	const { user } = useAuth();
	const isAdmin = user?.role === 'Admin';

	const loadModules = useCallback(async () => {
		setIsLoading(true);
		const { data, error } = isAdmin
			? await listModulesPendingRejected()
			: await listModulesForCurrentMonth();
		if (error) {
			console.error('Error cargando módulos:', error);
			toast({
				variant: 'destructive',
				title: 'Error al cargar módulos',
				description: translateError(error),
			});
		}
		if (!error) {
			setModules(data ?? []);
		}
		setIsLoading(false);
	}, [isAdmin]);

	const loadMonthModules = useCallback(async () => {
		setIsMonthLoading(true);
		const { data, error } = await listModulesForCurrentMonth();
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al cargar módulos',
				description: translateError(error) || 'Error al cargar módulos del mes actual.',
			});
		}
		if (!error) {
			setMonthModules(data ?? []);
		}
		setIsMonthLoading(false);
	}, []);

	useEffect(() => {
		loadModules();
	}, [loadModules]);

	const toggleMonthSection = () => {
		if (!monthOpen) {
			loadMonthModules();
		}
		setMonthOpen(!monthOpen);
	};

	const handleEdit = (module: Module) => {
		setListModal({ open: false, module: null });
		setEditingModule(module);
		setEditOpen(true);
	};

	const handleDelete = (module: Module) => {
		setDeleteConfirm({ open: true, module });
	};

	const handleSend = (module: Module) => {
		setSendConfirm({ open: true, module });
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
			if (isAdmin && monthOpen) {
				loadMonthModules();
			}
		}
		setIsDeleting(false);
	};

	const confirmSend = async () => {
		if (!sendConfirm.module) return;
		setIsSending(true);
		const { error } = await updateModule(sendConfirm.module.id, { status: 'pending' });
		if (error) {
			toast({
				variant: 'destructive',
				title: 'Error al enviar el módulo',
				description: translateError(error) || 'Ocurrió un error al enviar el módulo.',
			});
		} else {
			toast({
				title: 'Módulo enviado a revisión',
				description: 'El módulo quedó pendiente de revisión.',
			});
			setSendConfirm({ open: false, module: null });
			loadModules();
			if (isAdmin && monthOpen) {
				loadMonthModules();
			}
		}
		setIsSending(false);
	};

	const handleSaved = () => {
		setCreateOpen(false);
		setEditOpen(false);
		setEditingModule(null);
		loadModules();
		if (isAdmin && monthOpen) {
			loadMonthModules();
		}
	};

	const filteredModules = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return modules.filter((module) => {
			if (statusFilter !== 'all' && (module.status ?? 'not_send') !== statusFilter) {
				return false;
			}
			if (!query) return true;
			return [module.title, module.description, getModuleWorkLabel(module)]
				.filter(Boolean)
				.some((value) => value!.toLowerCase().includes(query));
		});
	}, [modules, searchQuery, statusFilter]);

	const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all';

	const listLabel = isAdmin ? 'pendiente(s) de revisión' : 'registrado(s) este mes';
	const countText = hasActiveFilters
		? `${filteredModules.length} de ${modules.length} módulo(s) ${listLabel}.`
		: `${modules.length} módulo(s) ${listLabel}.`;

	const searchField = (
		<div className="relative flex-1 min-w-0">
			<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="search"
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				placeholder="Buscar por título, obra o descripción..."
				className="pl-8 pr-8"
			/>
			{searchQuery && (
				<button
					type="button"
					onClick={() => setSearchQuery('')}
					className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					aria-label="Limpiar búsqueda"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);

	const clearFiltersBtn = hasActiveFilters && (
		<Button
			variant="outline"
			size="sm"
			onClick={() => {
				setSearchQuery('');
				setStatusFilter('all');
			}}
			type="button"
		>
			Limpiar
		</Button>
	);

	return (
		<div className="flex flex-col gap-4 min-w-0">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="min-w-0">
					<h2 className="text-lg mt-5 font-semibold">
						{isAdmin ? 'Listado de módulos' : 'Módulos del mes actual'}
					</h2>
					<p className="text-sm text-muted-foreground">{countText}</p>
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

			{isAdmin ? (
				<>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						{searchField}
						<div className="flex items-center gap-2">{clearFiltersBtn}</div>
					</div>

					<ModuleTable
						modules={filteredModules}
						isLoading={isLoading}
						showUser
						emptyText={
							hasActiveFilters
								? 'No hay módulos que coincidan con los filtros aplicados.'
								: undefined
						}
						onRowClick={(module) => setListModal({ open: true, module })}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onSend={handleSend}
					/>

					<div className="flex border-t pt-4">
						<Button variant="outline" className="gap-2" onClick={toggleMonthSection} type="button">
							{monthOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							{monthOpen ? 'Ocultar módulos del mes actual' : 'Ver módulos del mes actual'}
						</Button>
					</div>

					{monthOpen && (
						<>
							<div>
								<h3 className="text-base font-semibold">Módulos del mes actual</h3>
								<p className="text-sm text-muted-foreground">
									{monthModules.length} módulo(s) registrado(s) este mes.
								</p>
							</div>

							<ModuleTable
								modules={monthModules}
								isLoading={isMonthLoading}
								showUser
								emptyText="No hay módulos registrados este mes."
								onRowClick={(module) => setListModal({ open: true, module })}
								onEdit={handleEdit}
								onDelete={handleDelete}
								onSend={handleSend}
							/>

							<Button
								onClick={() => setLoadMoreOpen(true)}
								variant="outline"
								className="mx-auto flex"
								type="button"
							>
								Cargar más módulos por usuario, año y mes
							</Button>
						</>
					)}
				</>
			) : (
				<>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						{searchField}
						<div className="flex items-center gap-2">
							<Select
								value={statusFilter}
								onValueChange={(value) => setStatusFilter(value as ModuleStatus | 'all')}
							>
								<SelectTrigger className="w-full sm:w-[200px]" aria-label="Filtrar por estado">
									<SelectValue placeholder="Estado" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Todos los estados</SelectItem>
									{MODULE_STATUSES.map((status) => (
										<SelectItem key={status} value={status}>
											{getModuleStatusLabel(status)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{clearFiltersBtn}
						</div>
					</div>

					<ModuleTable
						modules={filteredModules}
						isLoading={isLoading}
						emptyText={
							hasActiveFilters
								? 'No hay módulos que coincidan con los filtros aplicados.'
								: undefined
						}
						onRowClick={(module) => setListModal({ open: true, module })}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onSend={handleSend}
					/>

					<Button
						onClick={() => setLoadMoreOpen(true)}
						variant="outline"
						className="mx-auto flex"
						type="button"
					>
						Cargar más módulos
					</Button>
				</>
			)}

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

			<ConfirmDialog
				open={sendConfirm.open}
				onOpenChange={(open) => setSendConfirm((prev) => ({ ...prev, open }))}
				title="Enviar a revisión"
				description="¿Deseas enviar este módulo a revisión?"
				confirmText="Enviar"
				loadingText="Enviando..."
				onConfirm={confirmSend}
				isLoading={isSending}
			/>

			<LoadMoreModulesModal
				open={loadMoreOpen}
				onOpenChange={setLoadMoreOpen}
				users={users}
				user={isAdmin ? null : user}
			/>
		</div>
	);
}
