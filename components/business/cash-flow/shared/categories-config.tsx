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
import { Settings, Plus, Edit, Ban, RotateCcw } from 'lucide-react';
import {
	CashFlowCategory,
	CategoryKind,
	createCategory,
	deactivateCategory,
	listCategories,
	reactivateCategory,
	updateCategory,
} from '@/lib/categories/categories';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

type ViewState = 'list' | 'form';

interface CategoriesConfigProps {
	kind: CategoryKind;
	title: string;
	triggerLabel: string;
	newLabel: string;
	emptyLabel: string;
}

export function CategoriesConfig({
	kind,
	title,
	triggerLabel,
	newLabel,
	emptyLabel,
}: CategoriesConfigProps) {
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [view, setView] = useState<ViewState>('list');
	const [editingCategory, setEditingCategory] = useState<CashFlowCategory | null>(null);

	const [categories, setCategories] = useState<CashFlowCategory[]>([]);
	const [loadingList, setLoadingList] = useState(false);
	const [showInactive, setShowInactive] = useState(false);
	const [categoryToDeactivate, setCategoryToDeactivate] = useState<CashFlowCategory | null>(null);
	const [actionLoading, setActionLoading] = useState(false);

	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);

	const visibleCategories = useMemo(
		() => (showInactive ? categories : categories.filter((c) => c.is_active)),
		[categories, showInactive]
	);

	const fetchCategories = async () => {
		setLoadingList(true);
		try {
			const { data, error } = await listCategories(kind);
			if (error) throw error;
			setCategories(data ?? []);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudieron cargar las categorías.',
				variant: 'destructive',
			});
		} finally {
			setLoadingList(false);
		}
	};

	useEffect(() => {
		if (open) {
			void fetchCategories();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setView('list');
			setEditingCategory(null);
		}
	};

	const handleAdd = () => {
		setEditingCategory(null);
		setName('');
		setView('form');
	};

	const handleEdit = (category: CashFlowCategory) => {
		setEditingCategory(category);
		setName(category.name);
		setView('form');
	};

	const handleCancelForm = () => {
		setView('list');
		setEditingCategory(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) return;
		setSaving(true);
		try {
			const { error } = editingCategory
				? await updateCategory(editingCategory.id, { name: trimmedName })
				: await createCategory({ name: trimmedName, kind });
			if (error) throw error;
			toast({
				title: editingCategory ? 'Categoría actualizada' : 'Categoría creada',
				description: editingCategory
					? 'La categoría ha sido actualizada correctamente.'
					: 'La categoría ha sido creada correctamente.',
			});
			setView('list');
			setEditingCategory(null);
			await fetchCategories();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo guardar la categoría.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	const confirmDeactivate = async () => {
		if (!categoryToDeactivate) return;
		setActionLoading(true);
		try {
			const { error } = await deactivateCategory(categoryToDeactivate.id);
			if (error) throw error;
			toast({
				title: 'Categoría desactivada',
				description: 'La categoría ha sido desactivada correctamente.',
			});
			await fetchCategories();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo desactivar la categoría.',
				variant: 'destructive',
			});
		} finally {
			setActionLoading(false);
			setCategoryToDeactivate(null);
		}
	};

	const handleReactivate = async (category: CashFlowCategory) => {
		setActionLoading(true);
		try {
			const { error } = await reactivateCategory(category.id);
			if (error) throw error;
			toast({
				title: 'Categoría reactivada',
				description: 'La categoría ha sido reactivada correctamente.',
			});
			await fetchCategories();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo reactivar la categoría.',
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
				{triggerLabel}
			</Button>

			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
					{view === 'list' ? (
						<>
							<DialogHeader>
								<DialogTitle>{title}</DialogTitle>
								<DialogDescription>
									Gestiona las categorías disponibles para {title.toLowerCase()}.
								</DialogDescription>
							</DialogHeader>

							<div className="space-y-4">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<div className="flex items-center gap-2">
										<Switch
											id={`show-inactive-categories-${kind}`}
											checked={showInactive}
											onCheckedChange={setShowInactive}
										/>
										<Label htmlFor={`show-inactive-categories-${kind}`}>Mostrar inactivas</Label>
									</div>
									<Button onClick={handleAdd} className="gap-2" disabled={actionLoading}>
										<Plus className="h-4 w-4" />
										{newLabel}
									</Button>
								</div>

								{loadingList ? (
									<Card className="bg-card border-border p-8 text-center text-muted-foreground">
										Cargando...
									</Card>
								) : visibleCategories.length === 0 ? (
									<Card className="bg-card border-border p-8 text-center text-muted-foreground">
										{emptyLabel}
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
												{visibleCategories.map((category) => (
													<TableRow key={category.id}>
														<TableCell className="font-medium text-center">
															{category.name}
														</TableCell>
														<TableCell className="text-center">
															<Badge variant={category.is_active ? 'default' : 'outline'}>
																{category.is_active ? 'Activa' : 'Inactiva'}
															</Badge>
														</TableCell>
														<TableCell className="text-center items-center justify-center">
															<div className="flex justify-center gap-2">
																<Button
																	variant="ghost"
																	size="sm"
																	aria-label="Editar"
																	title="Editar"
																	onClick={() => handleEdit(category)}
																	disabled={actionLoading}
																>
																	<Edit className="h-4 w-4" />
																</Button>
																{category.is_active ? (
																	<Button
																		variant="ghost"
																		size="sm"
																		aria-label="Desactivar"
																		title="Desactivar"
																		className="text-destructive"
																		onClick={() => setCategoryToDeactivate(category)}
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
																		onClick={() => handleReactivate(category)}
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
								<DialogTitle>{editingCategory ? 'Editar categoría' : newLabel}</DialogTitle>
								<DialogDescription>
									{editingCategory
										? 'Modifica el nombre de la categoría'
										: `Agrega una nueva categoría para ${title.toLowerCase()}`}
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="category-name">Nombre</Label>
									<Input
										id="category-name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										maxLength={60}
										required
										autoFocus
									/>
								</div>
								<div className="flex gap-2">
									<Button type="submit" disabled={saving} className="flex-1">
										{saving ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear'}
									</Button>
									<Button type="button" variant="outline" onClick={handleCancelForm}>
										Cancelar
									</Button>
								</div>
							</form>
						</>
					)}

					<AlertDialog
						open={!!categoryToDeactivate}
						onOpenChange={(nextOpen) => {
							if (!nextOpen && !actionLoading) setCategoryToDeactivate(null);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>¿Desactivar categoría?</AlertDialogTitle>
								<AlertDialogDescription>
									La categoría dejará de estar disponible para nuevos registros. Podrás reactivarla
									cuando quieras.
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
