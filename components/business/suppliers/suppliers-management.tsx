'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import { useSuppliers } from '@/hooks/suppliers/use-suppliers';
import { Supplier, deleteSupplier, updateSupplier } from '@/lib/suppliers/suppliers';
import { Skeleton } from '@/components/ui/skeleton';
import { onlyDigits } from '@/lib/suppliers/validation';
import {
	ALL_LOCALITIES,
	SUPPLIER_STATUS_FILTERS,
	SUPPLIERS_PAGE_SIZE,
	SupplierStatusFilter,
} from '@/constants/suppliers/suppliers';
import { SuppliersTable } from '@/components/business/suppliers/suppliers-table';
import { SupplierFormDialog } from '@/components/business/suppliers/supplier-form-dialog';
import { SupplierToggleActiveDialog } from '@/components/business/suppliers/supplier-toggle-active-dialog';
import { SupplierDeleteDialog } from '@/components/business/suppliers/supplier-delete-dialog';
import { normalize as normalizeText } from '@/utils/normalize';
import { translateError } from '@/lib/error-translator';

export function SuppliersManagement() {
	const { user, loading: authLoading } = useAuth();
	const { toast } = useToast();
	const isAuthorized = user?.role === 'Admin';
	const { suppliers, loading, error, refresh } = useSuppliers(isAuthorized);

	const [search, setSearch] = useState('');
	const [status, setStatus] = useState<SupplierStatusFilter>('active');
	const [locality, setLocality] = useState<string>(ALL_LOCALITIES);
	const [page, setPage] = useState(1);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editing, setEditing] = useState<Supplier | null>(null);
	const [toToggle, setToToggle] = useState<Supplier | null>(null);
	const [toDelete, setToDelete] = useState<Supplier | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => setPage(1), [search, status, locality]);

	const localities = useMemo(
		() =>
			Array.from(
				new Set(
					suppliers
						.map((s) => s.locality?.trim())
						.filter((l): l is string => !!l && l !== ALL_LOCALITIES)
				)
			).sort((a, b) => a.localeCompare(b)),
		[suppliers]
	);

	// Fall back to "all" when the selected locality no longer exists (e.g. after edits/deletes).
	const effectiveLocality =
		locality !== ALL_LOCALITIES && !localities.includes(locality) ? ALL_LOCALITIES : locality;

	const filtered = useMemo(() => {
		const term = normalizeText(search.trim());
		const termDigits = onlyDigits(term);
		const digitsMatch = termDigits.length >= 4;
		const has = (value: string | null) => normalizeText(value ?? '').includes(term);
		return suppliers.filter((s) => {
			if (status === 'active' && !s.is_active) return false;
			if (status === 'inactive' && s.is_active) return false;
			if (effectiveLocality !== ALL_LOCALITIES && (s.locality ?? '').trim() !== effectiveLocality)
				return false;
			if (!term) return true;
			return (
				has(s.name) ||
				has(s.business_name) ||
				has(s.category) ||
				has(s.email) ||
				has(s.locality) ||
				has(s.address) ||
				(digitsMatch &&
					((s.tax_id ?? '').includes(termDigits) || (s.whatsapp ?? '').includes(termDigits)))
			);
		});
	}, [suppliers, search, status, effectiveLocality]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / SUPPLIERS_PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const pageItems = filtered.slice(
		(currentPage - 1) * SUPPLIERS_PAGE_SIZE,
		currentPage * SUPPLIERS_PAGE_SIZE
	);

	if (authLoading) {
		return (
			<div className="space-y-4" aria-busy="true">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	if (!isAuthorized) {
		return (
			<Card className="p-12 bg-card border-border text-center">
				<p className="text-muted-foreground">No tenés permisos para ver esta sección.</p>
			</Card>
		);
	}

	const openForm = (supplier: Supplier | null) => {
		setEditing(supplier);
		setIsFormOpen(true);
	};

	const handleFormOpenChange = (open: boolean) => {
		setIsFormOpen(open);
		if (!open) setEditing(null);
	};

	const handleSaved = async () => {
		handleFormOpenChange(false);
		await reloadList();
	};

	const reloadList = async () => {
		const { ok, message } = await refresh();
		if (!ok) {
			toast({
				title: 'No se pudo actualizar la lista',
				description: message ?? 'Los cambios se guardaron, pero no se pudo recargar el listado.',
				variant: 'destructive',
			});
		}
	};

	const confirmToggleActive = async () => {
		if (!toToggle || busy) return;
		const supplier = toToggle;
		setBusy(true);
		const next = !supplier.is_active;
		try {
			const { error } = await updateSupplier(supplier.id, { is_active: next });
			if (error) throw error;
			toast({ title: next ? 'Proveedor activado' : 'Proveedor desactivado' });
			setToToggle(null);
			await reloadList();
		} catch (error) {
			toast({
				title: 'Error',
				description:
					translateError(error) || 'Ocurrió un error inesperado, por favor volvé a intentarlo.',
				variant: 'destructive',
			});
		} finally {
			setBusy(false);
		}
	};

	const confirmDelete = async () => {
		if (!toDelete) return;
		setBusy(true);
		try {
			const { error } = await deleteSupplier(toDelete.id);
			if (error) throw error;
			toast({ title: 'Proveedor eliminado' });
			setToDelete(null);
			await reloadList();
		} catch (error) {
			toast({
				title: 'No se pudo eliminar',
				description:
					translateError(error) || 'Ocurrió un error inesperado, por favor volvé a intentarlo.',
				variant: 'destructive',
			});
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="text-xl font-semibold">Proveedores</h2>
				<Button onClick={() => openForm(null)} className="gap-2">
					<Plus className="h-4 w-4" />
					Nuevo proveedor
				</Button>
			</div>

			<div className="flex flex-col gap-3 sm:flex-row">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar por nombre, razón social, CUIT, rubro, email o ubicación"
						className="pl-9"
					/>
				</div>
				<Select value={status} onValueChange={(v) => setStatus(v as SupplierStatusFilter)}>
					<SelectTrigger className="sm:w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{SUPPLIER_STATUS_FILTERS.map((f) => (
							<SelectItem key={f.value} value={f.value}>
								{f.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{(localities.length > 0 || effectiveLocality !== ALL_LOCALITIES) && (
					<Select value={effectiveLocality} onValueChange={setLocality}>
						<SelectTrigger className="sm:w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_LOCALITIES}>Todas las localidades</SelectItem>
							{localities.map((l) => (
								<SelectItem key={l} value={l}>
									{l}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			{loading ? (
				<Card className="p-8 text-center text-muted-foreground">Cargando proveedores...</Card>
			) : error ? (
				<Card className="p-8 text-center space-y-3">
					<p className="text-destructive">{error}</p>
					<Button variant="outline" onClick={() => refresh()}>
						Reintentar
					</Button>
				</Card>
			) : filtered.length === 0 ? (
				<Card className="bg-card border-border p-8 text-center text-muted-foreground">
					{suppliers.length === 0
						? 'Todavía no hay proveedores registrados'
						: 'No hay proveedores que coincidan con la búsqueda'}
				</Card>
			) : (
				<>
					<SuppliersTable
						suppliers={pageItems}
						busy={busy}
						onEdit={openForm}
						onToggleActive={(supplier) => setToToggle((current) => current ?? supplier)}
						onDelete={setToDelete}
					/>
					<PaginationControls
						currentPage={currentPage}
						totalPages={totalPages}
						totalItems={filtered.length}
						itemsPerPage={SUPPLIERS_PAGE_SIZE}
						onPageChange={setPage}
						itemLabel="proveedores"
					/>
				</>
			)}

			<SupplierFormDialog
				open={isFormOpen}
				supplier={editing}
				onOpenChange={handleFormOpenChange}
				onSaved={handleSaved}
			/>
			<SupplierToggleActiveDialog
				supplier={toToggle}
				loading={busy}
				onConfirm={confirmToggleActive}
				onCancel={() => setToToggle(null)}
			/>
			<SupplierDeleteDialog
				supplier={toDelete}
				loading={busy}
				onConfirm={confirmDelete}
				onCancel={() => setToDelete(null)}
			/>
		</div>
	);
}
