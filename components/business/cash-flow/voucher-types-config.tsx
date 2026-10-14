'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Receipt, Plus, Edit, Ban, RotateCcw } from 'lucide-react';
import {
	VoucherType,
	createVoucherType,
	deactivateVoucherType,
	listVoucherTypes,
	reactivateVoucherType,
	updateVoucherType,
} from '@/lib/voucher-types/voucher-types';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

type ViewState = 'list' | 'form';

// Mirrors CategoriesConfig's single-dialog list/form pattern for the voucher-type catalog.
export function VoucherTypesConfig() {
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [view, setView] = useState<ViewState>('list');
	const [editingVoucherType, setEditingVoucherType] = useState<VoucherType | null>(null);

	const [voucherTypes, setVoucherTypes] = useState<VoucherType[]>([]);
	const [loadingList, setLoadingList] = useState(false);
	const [showInactive, setShowInactive] = useState(false);
	const [voucherTypeToDeactivate, setVoucherTypeToDeactivate] = useState<VoucherType | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);

	const visibleVoucherTypes = useMemo(
		() => (showInactive ? voucherTypes : voucherTypes.filter((v) => v.is_active)),
		[voucherTypes, showInactive]
	);

	const fetchVoucherTypes = async () => {
		setLoadingList(true);
		try {
			const { data, error } = await listVoucherTypes();
			if (error) throw error;
			setVoucherTypes(data ?? []);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron cargar los tipos de comprobante.',
				variant: 'destructive',
			});
		} finally {
			setLoadingList(false);
		}
	};

	useEffect(() => {
		if (open) void fetchVoucherTypes();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setView('list');
			setEditingVoucherType(null);
		}
	};

	const handleAdd = () => {
		setEditingVoucherType(null);
		setName('');
		setView('form');
	};

	const handleEdit = (voucherType: VoucherType) => {
		setEditingVoucherType(voucherType);
		setName(voucherType.name);
		setView('form');
	};

	const handleCancelForm = () => {
		setView('list');
		setEditingVoucherType(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) return;
		setSaving(true);
		try {
			const { error } = editingVoucherType
				? await updateVoucherType(editingVoucherType.id, { name: trimmedName })
				: await createVoucherType({ name: trimmedName });
			if (error) throw error;
			toast({
				title: editingVoucherType
					? 'Tipo de comprobante actualizado'
					: 'Tipo de comprobante creado',
			});
			setView('list');
			setEditingVoucherType(null);
			await fetchVoucherTypes();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo guardar el tipo de comprobante.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	const confirmDeactivate = async () => {
		if (!voucherTypeToDeactivate) return;
		setActionLoading(true);
		try {
			const { error } = await deactivateVoucherType(voucherTypeToDeactivate.id);
			if (error) throw error;
			toast({ title: 'Tipo de comprobante desactivado' });
			await fetchVoucherTypes();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo desactivar el tipo de comprobante.',
				variant: 'destructive',
			});
		} finally {
			setActionLoading(false);
			setVoucherTypeToDeactivate(null);
		}
	};

	const handleReactivate = async (voucherType: VoucherType) => {
		setActionLoading(true);
		try {
			const { error } = await reactivateVoucherType(voucherType.id);
			if (error) throw error;
			toast({ title: 'Tipo de comprobante reactivado' });
			await fetchVoucherTypes();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo reactivar el tipo de comprobante.',
				variant: 'destructive',
			});
		} finally {
			setActionLoading(false);
		}
	};

	return (
		<>
			<Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenChange(true)}>
				<Receipt className="h-4 w-4" />
				Configurar tipos de comprobante
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
					{view === 'list' ? (
						<>
							<DialogHeader>
								<DialogTitle>Tipos de comprobante</DialogTitle>
								<DialogDescription>
									Gestiona los tipos de comprobante disponibles para ingresos y gastos.
								</DialogDescription>
							</DialogHeader>

							<div className="space-y-4">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<Switch
											id="show-inactive-voucher-types"
											checked={showInactive}
											onCheckedChange={setShowInactive}
										/>
										<Label htmlFor="show-inactive-voucher-types">Mostrar inactivos</Label>
									</div>
									<Button onClick={handleAdd} className="gap-2" disabled={actionLoading}>
										<Plus className="h-4 w-4" />
										Nuevo tipo de comprobante
									</Button>
								</div>

								{loadingList ? (
									<Card className="bg-card border-border p-8 text-center text-muted-foreground">
										Cargando...
									</Card>
								) : visibleVoucherTypes.length === 0 ? (
									<Card className="bg-card border-border p-8 text-center text-muted-foreground">
										No hay tipos de comprobante registrados
									</Card>
								) : (
									<Card className="bg-card border-border">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="text-center">Nombre</TableHead>
													<TableHead className="text-center">Estado</TableHead>
													<TableHead className="text-center">Acciones</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{visibleVoucherTypes.map((voucherType) => (
													<TableRow key={voucherType.id}>
														<TableCell className="font-medium text-center">
															{voucherType.name}
														</TableCell>
														<TableCell className="text-center">
															<Badge variant={voucherType.is_active ? 'default' : 'outline'}>
																{voucherType.is_active ? 'Activo' : 'Inactivo'}
															</Badge>
														</TableCell>
														<TableCell className="text-center">
															<div className="flex justify-center gap-2">
																<Button
																	variant="ghost"
																	size="sm"
																	aria-label="Editar"
																	title="Editar"
																	onClick={() => handleEdit(voucherType)}
																	disabled={actionLoading}
																>
																	<Edit className="h-4 w-4" />
																</Button>
																{voucherType.is_active ? (
																	<Button
																		variant="ghost"
																		size="sm"
																		aria-label="Desactivar"
																		title="Desactivar"
																		className="text-destructive"
																		onClick={() => setVoucherTypeToDeactivate(voucherType)}
																		disabled={actionLoading}
																	>
																		<Ban className="h-4 w-4" />
																	</Button>
																) : (
																	<Button
																		variant="ghost"
																		size="sm"
																		aria-label="Reactivar"
																		title="Reactivar"
																		onClick={() => handleReactivate(voucherType)}
																		disabled={actionLoading}
																	>
																		<RotateCcw className="h-4 w-4" />
																	</Button>
																)}
															</div>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</Card>
								)}
							</div>
						</>
					) : (
						<>
							<DialogHeader>
								<DialogTitle>
									{editingVoucherType ? 'Editar tipo de comprobante' : 'Nuevo tipo de comprobante'}
								</DialogTitle>
								<DialogDescription>
									{editingVoucherType
										? 'Modifica el nombre del tipo de comprobante'
										: 'Agrega un nuevo tipo de comprobante'}
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="voucher-type-name">Nombre</Label>
									<Input
										id="voucher-type-name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										maxLength={60}
										required
										autoFocus
									/>
								</div>
								<div className="flex gap-2">
									<Button type="submit" disabled={saving} className="flex-1">
										{saving ? 'Guardando...' : editingVoucherType ? 'Actualizar' : 'Crear'}
									</Button>
									<Button type="button" variant="outline" onClick={handleCancelForm}>
										Cancelar
									</Button>
								</div>
							</form>
						</>
					)}

					<AlertDialog
						open={!!voucherTypeToDeactivate}
						onOpenChange={(nextOpen) => {
							if (!nextOpen && !actionLoading) setVoucherTypeToDeactivate(null);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>¿Desactivar tipo de comprobante?</AlertDialogTitle>
								<AlertDialogDescription>
									Dejará de estar disponible para nuevos registros. Podrás reactivarlo cuando
									quieras.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
								<AlertDialogAction
									onClick={(e) => {
										e.preventDefault();
										void confirmDeactivate();
									}}
									disabled={actionLoading}
									className="bg-destructive text-destructive-foreground"
								>
									{actionLoading ? 'Desactivando...' : 'Desactivar'}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</DialogContent>
			</Dialog>
		</>
	);
}
