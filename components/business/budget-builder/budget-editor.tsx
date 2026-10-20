'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, FileDown, Link2, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { ClientSelect } from '@/components/ui/client-select';
import type {
	Budget,
	BudgetBuilderSettings,
	BudgetItem,
	BudgetStatus,
} from '@/lib/budget-builder/types';
import { BUDGET_STATUSES, CLIENT_VIEW_PATH } from '@/constants/budget-builder/budget-builder';
import {
	budgetCode,
	calculateBudget,
	itemFromTemplate,
	newId,
} from '@/helpers/budget-builder/calculate';
import { toClientBudget } from '@/helpers/budget-builder/share';
import type { SaveState } from '@/hooks/budget-builder/use-budget-builder';
import { downloadBudgetPdf } from '@/helpers/budget-builder/pdf';
import { formatCurrency } from '@/utils/formats-money';
import { BudgetItemCard } from '@/components/business/budget-builder/budget-item-card';
import { FormulaHelp } from '@/components/business/budget-builder/formula-help';

interface BudgetEditorProps {
	budget: Budget;
	settings: BudgetBuilderSettings;
	saveState: SaveState;
	onChange: (budget: Budget) => void;
	onBack: () => void;
	onFileInClient: (budget: Budget) => Promise<{ error: any }>;
}

const SAVE_LABELS: Record<SaveState, string> = {
	idle: 'Se guarda automáticamente.',
	saving: 'Guardando...',
	saved: 'Guardado.',
	error: 'No se pudo guardar. Revisá la conexión.',
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function BudgetEditor({
	budget,
	settings,
	saveState,
	onChange,
	onBack,
	onFileInClient,
}: BudgetEditorProps) {
	const { toast } = useToast();
	const [isSharing, setIsSharing] = useState(false);
	// Typing a name by hand is for someone who is not loaded as a client yet.
	const [manualClient, setManualClient] = useState(!budget.clientId && Boolean(budget.clientName));
	const totals = useMemo(() => calculateBudget(budget), [budget]);

	const set = (changes: Partial<Budget>) => onChange({ ...budget, ...changes });

	const setItem = (item: BudgetItem) =>
		set({ items: budget.items.map((current) => (current.id === item.id ? item : current)) });

	const addFromTemplate = (templateId: string) => {
		const template = settings.templates.find((candidate) => candidate.id === templateId);
		if (template) set({ items: [...budget.items, itemFromTemplate(template, settings.catalog)] });
	};

	const addBlank = () =>
		set({
			items: [
				...budget.items,
				{
					id: newId(),
					name: 'Mueble a medida',
					templateId: null,
					shape: 'bloque',
					dimensions: {
						width: 100,
						depth: 40,
						height: 80,
						thickness: 1.8,
						legs: 0,
						shelves: 0,
						doors: 0,
					},
					finish: 'roble',
					units: 1,
					notes: '',
					lines: [],
				},
			],
		});

	const duplicateItem = (item: BudgetItem) =>
		set({
			items: [
				...budget.items,
				{ ...item, id: newId(), lines: item.lines.map((line) => ({ ...line, id: newId() })) },
			],
		});

	// Short link: the budget stays in the database and the page always shows its latest version.
	const clientLink = async () =>
		`${window.location.origin}${CLIENT_VIEW_PATH}/${budget.publicToken}`;

	// Sharing the budget is what "sending" means, so the status follows on its own.
	const markSent = () => budget.status === 'borrador' && set({ status: 'enviado' });

	// Every version that goes out is also filed in the client's budgets tab: one step instead of two.
	const fileInClient = async () => {
		if (!budget.clientId) return;
		const { error } = await onFileInClient(budget);
		toast(
			error
				? {
						variant: 'destructive',
						title: 'No se pudo guardar el PDF en el cliente',
						description: translateError(error),
					}
				: {
						title: 'Guardado en el cliente',
						description: `El PDF quedó en Presupuestos de ${budget.clientName}.`,
					}
		);
	};

	const handleDownloadPdf = () => {
		downloadBudgetPdf(toClientBudget(budget, settings.company));
		fileInClient();
	};

	const handleCopyLink = async () => {
		setIsSharing(true);
		try {
			await navigator.clipboard.writeText(await clientLink());
			markSent();
			toast({ title: 'Link copiado', description: 'Pegalo donde quieras enviárselo al cliente.' });
			fileInClient();
		} catch {
			toast({ variant: 'destructive', title: 'No se pudo copiar el link' });
		} finally {
			setIsSharing(false);
		}
	};

	const handleWhatsApp = async () => {
		setIsSharing(true);
		try {
			const link = await clientLink();
			const greeting = budget.clientName ? `Hola ${budget.clientName}! ` : 'Hola! ';
			const text = `${greeting}Te comparto el presupuesto ${budgetCode(budget)}. Podés verlo en 3D y aprobarlo desde acá: ${link}`;
			const phone = onlyDigits(budget.clientContact);
			const target = phone.length >= 8 ? `https://wa.me/${phone}` : 'https://wa.me/';
			window.open(`${target}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
			markSent();
			fileInClient();
		} finally {
			setIsSharing(false);
		}
	};

	const hasItems = budget.items.length > 0;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="icon" onClick={onBack} aria-label="Volver a la lista">
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<div>
						<h2 className="text-2xl font-bold text-foreground">{budgetCode(budget)}</h2>
						<p
							className={`text-xs ${saveState === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
						>
							{SAVE_LABELS[saveState]}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<Select
						value={budget.status}
						onValueChange={(status) => set({ status: status as BudgetStatus })}
					>
						<SelectTrigger className="w-36" aria-label="Estado">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{BUDGET_STATUSES.map((status) => (
								<SelectItem key={status.value} value={status.value}>
									{status.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						className="gap-2"
						disabled={!hasItems}
						onClick={handleDownloadPdf}
					>
						<FileDown className="h-4 w-4" />
						PDF
					</Button>
					<Button
						variant="outline"
						className="gap-2"
						disabled={!hasItems || isSharing}
						onClick={handleCopyLink}
					>
						<Link2 className="h-4 w-4" />
						Copiar link
					</Button>
					<Button className="gap-2" disabled={!hasItems || isSharing} onClick={handleWhatsApp}>
						<Send className="h-4 w-4" />
						Enviar por WhatsApp
					</Button>
				</div>
			</div>

			{budget.clientResponse && (
				<Card
					className={`border-border p-4 text-sm ${budget.clientResponse === 'aprobado' ? 'bg-green-500/10' : 'bg-red-500/10'}`}
				>
					<p className="font-medium text-foreground">
						El cliente {budget.clientResponse === 'aprobado' ? 'aprobó' : 'rechazó'} el presupuesto
						{budget.respondedAt
							? ` el ${new Date(budget.respondedAt).toLocaleDateString('es-AR')}`
							: ''}
						.
					</p>
					{budget.clientComment && (
						<p className="mt-1 whitespace-pre-line text-muted-foreground">
							“{budget.clientComment}”
						</p>
					)}
				</Card>
			)}

			<Card className="grid gap-3 border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
				<div className="grid gap-1 lg:col-span-1">
					<Label htmlFor="client-name">Cliente</Label>
					{manualClient ? (
						<div className="flex gap-1">
							<Input
								id="client-name"
								value={budget.clientName}
								placeholder="Nombre y apellido"
								onChange={(event) => set({ clientName: event.target.value })}
							/>
							<Button
								variant="ghost"
								size="sm"
								className="shrink-0 px-2 text-xs"
								onClick={() => setManualClient(false)}
							>
								Elegir
							</Button>
						</div>
					) : (
						<ClientSelect
							value={budget.clientId}
							placeholder="Elegí un cliente"
							onValueChange={(clientId, clientName, client) =>
								set({
									clientId,
									clientName: clientName ?? '',
									// Their WhatsApp comes along, unless the seller already typed one.
									clientContact: budget.clientContact || client?.phone_number || '',
								})
							}
							onManualInput={() => {
								set({ clientId: null });
								setManualClient(true);
							}}
						/>
					)}
					{budget.clientId && (
						<p className="text-[11px] text-muted-foreground">
							El PDF se guarda solo en sus Presupuestos al enviarlo o descargarlo.
						</p>
					)}
				</div>
				<div className="grid gap-1">
					<Label htmlFor="client-contact">WhatsApp del cliente</Label>
					<Input
						id="client-contact"
						value={budget.clientContact}
						placeholder="5493584000000"
						onChange={(event) => set({ clientContact: event.target.value })}
					/>
				</div>
				<div className="grid gap-1">
					<Label htmlFor="margin">Ganancia (%)</Label>
					<Input
						id="margin"
						type="number"
						min={0}
						value={budget.marginPercent}
						onChange={(event) => set({ marginPercent: Number(event.target.value) || 0 })}
					/>
				</div>
				<div className="grid gap-1">
					<Label htmlFor="validity">Validez (días)</Label>
					<Input
						id="validity"
						type="number"
						min={1}
						value={budget.validityDays}
						onChange={(event) => set({ validityDays: Number(event.target.value) || 1 })}
					/>
				</div>
			</Card>

			<div className="space-y-4">
				{totals.items.map(({ item, calc, price }) => (
					<BudgetItemCard
						key={item.id}
						item={item}
						calc={calc}
						price={price}
						catalog={settings.catalog}
						onChange={setItem}
						onDuplicate={() => duplicateItem(item)}
						onRemove={() =>
							set({ items: budget.items.filter((current) => current.id !== item.id) })
						}
					/>
				))}

				<Card className="space-y-3 border-dashed border-border bg-card p-4">
					<p className="text-sm font-medium text-foreground">
						{hasItems ? 'Agregar otro mueble' : '¿Qué vas a presupuestar?'}
					</p>
					<div className="flex flex-wrap gap-2">
						{settings.templates.map((template) => (
							<Button
								key={template.id}
								variant="outline"
								size="sm"
								className="gap-1"
								onClick={() => addFromTemplate(template.id)}
							>
								<Plus className="h-4 w-4" />
								{template.name}
							</Button>
						))}
						<Button variant="ghost" size="sm" className="gap-1" onClick={addBlank}>
							<Plus className="h-4 w-4" />A medida, en blanco
						</Button>
					</div>
					{!hasItems && <FormulaHelp />}
				</Card>
			</div>

			<Card className="grid gap-4 border-border bg-card p-4 md:grid-cols-[1fr_auto]">
				<Textarea
					value={budget.notes}
					onChange={(event) => set({ notes: event.target.value })}
					placeholder="Condiciones para el cliente: forma de pago, plazo de entrega, colocación..."
					className="min-h-20 text-sm"
				/>
				<div className="grid min-w-56 content-start gap-1 text-sm">
					<div className="flex justify-between gap-6 text-muted-foreground">
						<span>Costo</span>
						<span className="tabular-nums">{formatCurrency(totals.cost)}</span>
					</div>
					<div className="flex justify-between gap-6 text-muted-foreground">
						<span>Ganancia</span>
						<span className="tabular-nums">{formatCurrency(totals.margin)}</span>
					</div>
					<div className="mt-1 flex justify-between gap-6 border-t border-border pt-2 text-base font-semibold text-foreground">
						<span>Total</span>
						<span className="tabular-nums">{formatCurrency(totals.total)}</span>
					</div>
				</div>
			</Card>
		</div>
	);
}
