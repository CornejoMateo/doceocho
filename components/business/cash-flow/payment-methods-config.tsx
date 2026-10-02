'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Settings, Plus, Edit, Ban, RotateCcw } from 'lucide-react';
import {
	PaymentMethod,
	createPaymentMethod,
	listPaymentMethods,
	updatePaymentMethod,
} from '@/lib/payment-methods/payment-methods';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

type ViewState = 'list' | 'form';

export function PaymentMethodsConfig() {
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [view, setView] = useState<ViewState>('list');
	const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

	const [methods, setMethods] = useState<PaymentMethod[]>([]);
	const [loadingList, setLoadingList] = useState(false);
	const [showInactive, setShowInactive] = useState(false);
	const [methodToDeactivate, setMethodToDeactivate] = useState<PaymentMethod | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	const [name, setName] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const isSubmittingRef = useRef(false);

	const visibleMethods = useMemo(
		() => (showInactive ? methods : methods.filter((m) => m.is_active)),
		[methods, showInactive]
	);

	const fetchMethods = async () => {
		setLoadingList(true);
		try {
			const { data, error } = await listPaymentMethods();
			if (error) throw error;
			setMethods(data ?? []);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron cargar los métodos de pago.',
				variant: 'destructive',
			});
		} finally {
			setLoadingList(false);
		}
	};

	useEffect(() => {
		if (open) {
			void fetchMethods();
		}
	}, [open]);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setView('list');
			setEditingMethod(null);
		}
	};

	const handleAdd = () => {
		setEditingMethod(null);
		setName('');
		setView('form');
	};

	const handleEdit = (method: PaymentMethod) => {
		setEditingMethod(method);
		setName(method.name);
		setView('form');
	};

	const handleCancelForm = () => {
		setView('list');
		setEditingMethod(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting || isSubmittingRef.current) return;
		const trimmedName = name.trim();
		if (!trimmedName) {
			toast({
				title: 'Datos incompletos',
				description: 'Completa el nombre del método de pago.',
				variant: 'destructive',
			});
			return;
		}
		isSubmittingRef.current = true;
		setIsSubmitting(true);
		try {
			if (editingMethod) {
				const { error } = await updatePaymentMethod(editingMethod.id, { name: trimmedName });
				if (error) throw error;
				toast({
					title: 'Método actualizado',
					description: 'El método de pago ha sido actualizado correctamente.',
				});
			} else {
				const { error } = await createPaymentMethod({ name: trimmedName, is_active: true });
				if (error) throw error;
				toast({
					title: 'Método creado',
					description: 'El método de pago ha sido creado correctamente.',
				});
			}
			setView('list');
			setEditingMethod(null);
			await fetchMethods();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo guardar el método de pago.',
				variant: 'destructive',
			});
		} finally {
			isSubmittingRef.current = false;
			setIsSubmitting(false);
		}
	};

	const confirmDeactivate = async () => {
		if (!methodToDeactivate) return;
		setActionLoading(true);
		try {
			const { error } = await updatePaymentMethod(methodToDeactivate.id, { is_active: false });
			if (error) throw error;
			toast({
				title: 'Método desactivado',
				description: 'El método de pago ha sido desactivado correctamente.',
			});
			await fetchMethods();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo desactivar el método de pago.',
				variant: 'destructive',
			});
		} finally {
			setActionLoading(false);
			setMethodToDeactivate(null);
		}
	};

	const handleReactivate = async (method: PaymentMethod) => {
		setActionLoading(true);
		try {
			const { error } = await updatePaymentMethod(method.id, { is_active: true });
			if (error) throw error;
			toast({
				title: 'Método reactivado',
				description: 'El método de pago ha sido reactivado correctamente.',
			});
			await fetchMethods();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo reactivar el método de pago.',
				variant: 'destructive',
			});
		} finally {
			setActionLoading(false);
		}
	};

	return (
		<>
			<Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenChange(true)}>
				<Settings className="h-4 w-4" />
				Configurar métodos de pago
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
					{view === 'list' ? (
						<>
							<DialogHeader>
								<DialogTitle>Métodos de pago</DialogTitle>
								<DialogDescription>
									Gestiona los métodos de pago disponibles para los movimientos.
								</DialogDescription>
							</DialogHeader>

							<div className="space-y-4">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<Switch
											id="show-inactive-payment-methods"
											checked={showInactive}
											onCheckedChange={setShowInactive}
										/>
										<Label htmlFor="show-inactive-payment-methods">Mostrar inactivos</Label>
									</div>
									<Button onClick={handleAdd} className="gap-2" disabled={actionLoading}>
										<Plus className="h-4 w-4" />
										Nuevo
									</Button>
								</div>

								{loadingList ? (
									<Card className="bg-card border-border p-8 text-center text-muted-foreground">
										Cargando...
									</Card>
								) : visibleMethods.length === 0 ? (
									<Card className="bg-card border-border p-8 text-center text-muted-foreground">
										No hay métodos de pago registrados
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
												{visibleMethods.map((method) => (
													<TableRow key={method.id}>
														<TableCell className="font-medium text-center">{method.name}</TableCell>
														<TableCell className="text-center">
															<Badge variant={method.is_active ? 'default' : 'outline'}>
																{method.is_active ? 'Activo' : 'Inactivo'}
															</Badge>
														</TableCell>
														<TableCell className="text-center items-center justify-center">
															<div className="flex justify-center gap-2">
																<Button
																	variant="ghost"
																	size="sm"
																	aria-label="Editar"
																	title="Editar"
																	onClick={() => handleEdit(method)}
																	disabled={actionLoading}
																>
																	<Edit className="h-4 w-4" />
																</Button>
																{method.is_active ? (
																	<Button
																		variant="ghost"
																		size="sm"
																		aria-label="Desactivar"
																		title="Desactivar"
																		className="text-destructive"
																		onClick={() => setMethodToDeactivate(method)}
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
																		onClick={() => handleReactivate(method)}
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
								<DialogTitle>{editingMethod ? 'Editar método' : 'Nuevo método'}</DialogTitle>
								<DialogDescription>
									{editingMethod
										? 'Modifica el nombre del método de pago'
										: 'Agrega un nuevo método de pago'}
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="payment-method-name">Nombre</Label>
									<Input
										id="payment-method-name"
										placeholder="Ej: Transferencia Bancaria"
										value={name}
										onChange={(e) => setName(e.target.value)}
										required
									/>
								</div>
								<div className="flex gap-2">
									<Button type="submit" disabled={isSubmitting} className="flex-1">
										{isSubmitting ? 'Guardando...' : editingMethod ? 'Actualizar' : 'Crear'}
									</Button>
									<Button type="button" variant="outline" onClick={handleCancelForm}>
										Cancelar
									</Button>
								</div>
							</form>
						</>
					)}

					<AlertDialog
						open={!!methodToDeactivate}
						onOpenChange={(nextOpen) => {
							if (!nextOpen && !actionLoading) setMethodToDeactivate(null);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>¿Desactivar método de pago?</AlertDialogTitle>
								<AlertDialogDescription>
									El método dejará de estar disponible para nuevos movimientos, pero los movimientos
									históricos conservarán su método. Podrás reactivarlo cuando quieras.
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
