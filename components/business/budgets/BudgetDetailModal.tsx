'use client';

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit, CheckCircle } from 'lucide-react';
import { BudgetWithWork } from '@/lib/balances/balances';
import {
	formatCurrency,
	formatCurrencyUSD,
	formatCurrencyWithoutSymbol,
} from '@/utils/formats-money';
import { formatCreatedAt } from '@/utils/format-date';
import { BudgetStatusSelector } from '@/components/ui/budget-status-selector';
import { getBudgetStatus } from '@/constants/budgets/budget-status';

interface BudgetDetailModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	budget: BudgetWithWork | null;
	isLoading: boolean;
	onEdit: (budget: BudgetWithWork) => void;
	onChooseBudget: (budgetId: number) => void;
	onViewPdf: (budget: BudgetWithWork) => void;
	onStatusChange: (budgetId: number, newStatus: string) => void;
	onClose: () => void;
}

export function BudgetDetailModal({
	isOpen,
	onOpenChange,
	budget,
	isLoading,
	onEdit,
	onChooseBudget,
	onViewPdf,
	onStatusChange,
	onClose,
}: BudgetDetailModalProps) {
	if (!budget) return null;

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileText className="h-5 w-5" />
						Detalles del Presupuesto
					</DialogTitle>
					<DialogDescription>Información completa del presupuesto seleccionado</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label className="text-sm font-medium text-muted-foreground">Tipo</Label>
							<p className="text-sm font-semibold">{budget.type}</p>
						</div>
						<div>
							<Label className="text-sm font-medium text-muted-foreground">Número</Label>
							<p className="text-sm font-semibold">#{budget.number || 'Sin número'}</p>
						</div>
						<div>
							<Label className="text-sm font-medium text-muted-foreground mt-2">
								Fecha de emisión
							</Label>
							<p className="text-sm font-semibold">{formatCreatedAt(budget.created_at)}</p>
						</div>
						<div>
							<Label className="text-sm font-medium text-muted-foreground">Estado</Label>
							<div className="mt-1">
								<BudgetStatusSelector
									value={getBudgetStatus(budget)}
									onValueChange={(newStatus) => onStatusChange(budget.id, newStatus)}
									disabled={isLoading}
									className="w-full"
								/>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label className="text-sm font-medium text-muted-foreground">Monto ARS</Label>
							<p className="text-sm font-semibold">
								{formatCurrencyWithoutSymbol(budget.amount_ars)}
							</p>
						</div>
						<div>
							<Label className="text-sm font-medium text-muted-foreground">Monto USD</Label>
							<p className="text-sm font-semibold">{formatCurrencyUSD(budget.amount_usd)}</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label className="text-sm font-medium text-muted-foreground">USD Cotización</Label>
							<p className="text-sm font-semibold">{formatCurrency(budget.usd_quote) || 'N/A'}</p>
						</div>
						<div>
							<Label className="text-sm font-medium text-muted-foreground">Obra</Label>
							<p className="text-sm font-semibold">
								{budget.folder_budget?.work
									? `${budget.folder_budget.work.address} - ${budget.folder_budget.work.locality}`
									: 'Sin obra asignada'}
							</p>
						</div>
						{budget.date_of_sale && (
							<div>
								<Label className="text-sm font-medium text-muted-foreground">Fecha de venta</Label>
								<p className="text-sm font-semibold">{formatCreatedAt(budget.date_of_sale)}</p>
							</div>
						)}

						<div>
							<Label className="text-sm font-medium text-muted-foreground">PDF</Label>
							<div className="flex items-center gap-2 mt-1">
								{budget.pdf_path ? (
									<Button
										variant="outline"
										size="sm"
										onClick={() => onViewPdf(budget)}
										className="gap-2"
									>
										<FileText className="h-4 w-4" /> Ver PDF
									</Button>
								) : (
									<Badge variant="secondary">Borrador - Sin PDF</Badge>
								)}
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-4 border-t">
						<Button variant="outline" onClick={onClose}>
							Cerrar
						</Button>
						<Button
							variant="outline"
							onClick={() => onEdit(budget)}
							className="gap-2"
							disabled={isLoading}
						>
							<Edit className="h-4 w-4" />
							Editar
						</Button>
						{!budget.accepted && (
							<Button
								onClick={() => {
									onChooseBudget(budget.id);
									onClose();
								}}
								className="gap-2"
							>
								<CheckCircle className="h-4 w-4" />
								Elegir
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
