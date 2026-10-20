'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, Download, Plus, Search, Settings, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import type { Budget } from '@/lib/budget-builder/types';
import { BUDGET_STATUSES } from '@/constants/budget-builder/budget-builder';
import { budgetCode, calculateBudget } from '@/helpers/budget-builder/calculate';
import { useBudgetBuilder } from '@/hooks/budget-builder/use-budget-builder';
import { formatCurrency } from '@/utils/formats-money';
import { BudgetEditor } from '@/components/business/budget-builder/budget-editor';
import { SettingsDialog } from '@/components/business/budget-builder/settings/settings-dialog';

const STATUS_STYLES: Record<Budget['status'], string> = {
	borrador: 'text-muted-foreground',
	enviado: 'text-blue-600 dark:text-blue-400',
	aprobado: 'text-green-600 dark:text-green-400',
	rechazado: 'text-red-600 dark:text-red-400',
};

const statusLabel = (status: Budget['status']) =>
	BUDGET_STATUSES.find((candidate) => candidate.value === status)?.label ?? status;

export function BudgetBuilderManagement() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const store = useBudgetBuilder();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [toDelete, setToDelete] = useState<Budget | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

	// The open budget lives in the URL, so a refresh or the back button keeps the place.
	const openId = searchParams.get('id');
	const openBudget = store.budgets.find((budget) => budget.id === openId) ?? null;

	const open = (id: string | null) => router.push(id ? `?id=${id}` : '?', { scroll: false });

	const openNew = async (create: () => Promise<Budget | null>) => {
		setIsCreating(true);
		const budget = await create();
		setIsCreating(false);
		if (budget) open(budget.id);
	};

	const handleImport = async () => {
		setIsImporting(true);
		await store.importLocalData();
		setIsImporting(false);
	};

	const catalogIsEmpty =
		store.settings.catalog.length === 0 && store.settings.templates.length === 0;

	const rows = useMemo(() => {
		const term = search.trim().toLowerCase();
		return store.budgets
			.filter(
				(budget) =>
					!term ||
					budget.clientName.toLowerCase().includes(term) ||
					budgetCode(budget).toLowerCase().includes(term)
			)
			.map((budget) => ({ budget, total: calculateBudget(budget).total }));
	}, [store.budgets, search]);

	if (!store.loaded) return null;

	if (store.loadError) {
		return (
			<Card className="p-6 text-sm text-muted-foreground">
				<p className="font-medium text-foreground">No se pudo cargar el presupuestador.</p>
				<p className="mt-1">
					Revisá que el SQL del presupuestador esté corrido en esta base
					(schema-supabase/budget-builder/budget-builder.sql). Detalle: {store.loadError}
				</p>
			</Card>
		);
	}

	if (openBudget) {
		return (
			<BudgetEditor
				budget={openBudget}
				settings={store.settings}
				saveState={store.saveState}
				onChange={store.updateBudget}
				onBack={() => open(null)}
				onFileInClient={store.fileInClient}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground text-balance">Presupuestador</h2>
					<p className="text-muted-foreground mt-1">
						Elegí qué vas a hacer, poné las medidas y el presupuesto se arma solo.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" className="gap-2" onClick={() => setSettingsOpen(true)}>
						<Settings className="h-4 w-4" />
						Configuración
					</Button>
					<Button className="gap-2" disabled={isCreating} onClick={() => openNew(store.addBudget)}>
						<Plus className="h-4 w-4" />
						Nuevo presupuesto
					</Button>
				</div>
			</div>

			{store.localBudgetsCount > 0 && (
				<Card className="flex flex-col gap-3 border-dashed border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-muted-foreground">
						Este navegador tiene {store.localBudgetsCount}{' '}
						{store.localBudgetsCount === 1 ? 'presupuesto guardado' : 'presupuestos guardados'} de
						la versión de prueba. Traelos para que los vea todo el equipo.
					</p>
					<Button
						variant="outline"
						className="gap-2 shrink-0"
						disabled={isImporting}
						onClick={handleImport}
					>
						<Download className="h-4 w-4" />
						{isImporting ? 'Trayendo...' : 'Traer presupuestos'}
					</Button>
				</Card>
			)}

			{catalogIsEmpty && (
				<Card className="flex flex-col gap-3 border-dashed border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-muted-foreground">
						Todavía no hay insumos ni tipos de mueble. Cargá los de ejemplo y ajustá los precios, o
						armá los tuyos desde Configuración.
					</p>
					<Button variant="outline" className="gap-2 shrink-0" onClick={store.loadExamples}>
						<Sparkles className="h-4 w-4" />
						Cargar ejemplos
					</Button>
				</Card>
			)}

			<Card className="gap-0 border-border bg-card p-0">
				<div className="border-b border-border p-3">
					<div className="relative max-w-sm">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Buscar por cliente o código"
							className="pl-9"
						/>
					</div>
				</div>

				{rows.length === 0 ? (
					<p className="p-8 text-center text-sm text-muted-foreground">
						{store.budgets.length === 0
							? 'Todavía no hay presupuestos. Creá el primero con "Nuevo presupuesto".'
							: 'No hay presupuestos que coincidan con la búsqueda.'}
					</p>
				) : (
					<ul className="divide-y divide-border">
						{rows.map(({ budget, total }) => (
							<li key={budget.id}>
								<div
									role="button"
									tabIndex={0}
									onClick={() => open(budget.id)}
									onKeyDown={(event) => event.key === 'Enter' && open(budget.id)}
									className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 hover:bg-secondary/50 sm:grid-cols-[6rem_1fr_7rem_8rem_6rem_auto]"
								>
									<span className="font-mono text-sm text-foreground">{budgetCode(budget)}</span>
									<span className="hidden truncate text-sm text-foreground sm:block">
										{budget.clientName || 'Sin cliente'}
										<span className="ml-2 text-xs text-muted-foreground">
											{budget.items.length} {budget.items.length === 1 ? 'mueble' : 'muebles'}
										</span>
									</span>
									<span className="hidden text-xs text-muted-foreground sm:block">
										{new Date(budget.createdAt).toLocaleDateString('es-AR')}
									</span>
									<span className="hidden text-right text-sm tabular-nums text-foreground sm:block">
										{formatCurrency(total)}
									</span>
									<span className={`hidden text-xs sm:block ${STATUS_STYLES[budget.status]}`}>
										{statusLabel(budget.status)}
									</span>
									<div
										className="flex justify-end gap-1"
										onClick={(event) => event.stopPropagation()}
									>
										<Button
											variant="ghost"
											size="icon"
											aria-label="Duplicar presupuesto"
											disabled={isCreating}
											onClick={() => openNew(() => store.duplicateBudget(budget))}
										>
											<Copy className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											aria-label="Eliminar presupuesto"
											onClick={() => setToDelete(budget)}
											className="text-muted-foreground hover:text-destructive"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							</li>
						))}
					</ul>
				)}
			</Card>

			<SettingsDialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				settings={store.settings}
				onChange={store.updateSettings}
			/>

			<AlertDialog open={toDelete !== null} onOpenChange={(isOpen) => !isOpen && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
						<AlertDialogDescription>
							¿Eliminar {toDelete ? budgetCode(toDelete) : ''}? Esta acción no se puede deshacer.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (toDelete) store.removeBudget(toDelete.id);
								setToDelete(null);
							}}
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
