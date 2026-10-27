'use client';

import { authFetch } from '@/lib/auth/auth-fetch';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Loader2,
	TrendingUp,
	Calendar,
	DollarSign,
	AlertCircle,
	CheckCircle,
	Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BudgetWithWork } from '@/lib/balances/balances';
import { isBudgetLocked } from '@/constants/budgets/budget-status';
import { BUDGET_STATUS_LABELS, BUDGET_STATUS_COLORS } from '@/constants/budgets/budget-status';
import { LockedBudgetsList } from '@/components/ui/locked-budgets-list';

interface DollarRate {
	moneda: string;
	casa: string;
	nombre: string;
	compra: number;
	venta: number;
	fechaActualizacion: string;
}

interface ClientBudgetsDollarUpdateModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	budgets: BudgetWithWork[];
	clientId: number;
	onUpdateConfirmed: (newUsdRate: number) => Promise<void>;
}

export function ClientBudgetsDollarUpdateModal({
	isOpen,
	onOpenChange,
	budgets,
	clientId,
	onUpdateConfirmed,
}: ClientBudgetsDollarUpdateModalProps) {
	const [currentRate, setCurrentRate] = useState<DollarRate | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Filter budgets that have USD amount and are not locked
	const budgetsWithUSD = budgets.filter((b) => b.amount_usd && b.amount_usd > 0);
	const lockedBudgets = budgetsWithUSD.filter(isBudgetLocked);
	const updatableBudgets = budgetsWithUSD.filter((budget) => !isBudgetLocked(budget));

	const getBudgetStatusBadge = (budget: BudgetWithWork) => {
		if (budget.sold) {
			return (
				<Badge className={`text-xs ${BUDGET_STATUS_COLORS.sold}`}>
					{BUDGET_STATUS_LABELS.sold}
				</Badge>
			);
		}
		if (budget.accepted) {
			return (
				<Badge className={`text-xs ${BUDGET_STATUS_COLORS.accepted}`}>
					{BUDGET_STATUS_LABELS.accepted}
				</Badge>
			);
		}
		return null;
	};

	const fetchCurrentRate = async () => {
		try {
			setIsLoading(true);
			setError(null);
			const response = await authFetch('/api/dollar-rate');

			if (!response.ok) {
				throw new Error('No se pudo obtener el tipo de cambio');
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Error en la respuesta');
			}

			// Transform the API response to match our interface
			const transformedData: DollarRate = {
				moneda: result.data.currency,
				casa: 'oficial',
				nombre: result.data.name,
				compra: result.data.buyRate,
				venta: result.data.sellRate,
				fechaActualizacion: result.data.lastUpdated,
			};

			setCurrentRate(transformedData);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error desconocido');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (isOpen) {
			fetchCurrentRate();
		}
	}, [isOpen]);

	const handleUpdate = async () => {
		if (!currentRate || updatableBudgets.length === 0) return;

		try {
			setIsUpdating(true);

			const response = await authFetch('/api/budget-dollar-rate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					clientId,
					newUsdRate: currentRate.venta,
				}),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Error al actualizar el tipo de cambio');
			}

			await onUpdateConfirmed(currentRate.venta);
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al actualizar');
		} finally {
			setIsUpdating(false);
		}
	};

	const calculateSummary = () => {
		if (!currentRate || updatableBudgets.length === 0) return null;

		const totalCurrentARS = updatableBudgets.reduce(
			(sum, budget) => sum + (budget.amount_ars || 0),
			0
		);
		const totalUSD = updatableBudgets.reduce((sum, budget) => sum + (budget.amount_usd || 0), 0);
		const totalNewARS = totalUSD * currentRate.venta;
		const difference = totalNewARS - totalCurrentARS;

		return {
			budgetsCount: updatableBudgets.length,
			totalCurrentARS,
			totalUSD,
			totalNewARS,
			difference,
		};
	};

	const summary = calculateSummary();

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md max-h-[90vh] flex flex-col">
				<DialogHeader className="flex-shrink-0">
					<DialogTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
						Actualizar Todos los Presupuestos
					</DialogTitle>
					<DialogDescription>
						Actualice todos los presupuestos del cliente con el tipo de cambio oficial del día
					</DialogDescription>
				</DialogHeader>

				{error && (
					<Alert variant="destructive" className="flex-shrink-0">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<div className="flex-1 overflow-y-auto space-y-4 min-h-0">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin" />
							<span className="ml-2">Obteniendo cotización...</span>
						</div>
					) : currentRate ? (
						<div className="space-y-4">
							{/* Current Rate Info */}
							<div className="bg-secondary/50 rounded-lg p-3 flex-shrink-0">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">Dólar Oficial</span>
									<Badge variant="outline" className="text-xs">
										Vigente
									</Badge>
								</div>
								<div className="flex items-center gap-2">
									<DollarSign className="h-4 w-4 text-primary" />
									<span className="text-xl font-bold">
										${currentRate.venta.toLocaleString('es-AR')}
									</span>
								</div>
								<div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
									<Calendar className="h-3 w-3" />
									Actualizado:{' '}
									{format(new Date(currentRate.fechaActualizacion), 'dd/MM/yyyy HH:mm', {
										locale: es,
									})}
								</div>
							</div>

							{/* Summary */}
							{summary && (
								<div className="space-y-3">
									<h4 className="text-sm font-medium">Presupuestos que se actualizarán:</h4>

									{/* Locked Budgets Warning */}
									{lockedBudgets.length > 0 && (
										<div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
											<div className="flex items-center gap-2 mb-1">
												<AlertCircle className="h-3 w-3 text-yellow-600" />
												<span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
													{lockedBudgets.length} presupuesto(s) bloqueados
												</span>
											</div>
											<p className="text-xs text-yellow-700 dark:text-yellow-300">
												Vendidos/elegidos no se modificarán
											</p>
											<LockedBudgetsList lockedBudgets={lockedBudgets} />
										</div>
									)}

									<div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
										<div className="flex items-center gap-2 mb-1">
											<CheckCircle className="h-3 w-3 text-blue-600" />
											<span className="text-xs font-medium text-blue-800 dark:text-blue-200">
												{summary.budgetsCount} presupuesto(s) se actualizarán
											</span>
										</div>
										<p className="text-xs text-blue-700 dark:text-blue-300">
											Con monto USD y sin bloqueo
										</p>
									</div>

									{/* Individual Budget Changes */}
									<div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
										{updatableBudgets.map((budget) => {
											const currentARS = budget.amount_ars || 0;
											const newARS = (budget.amount_usd || 0) * currentRate.venta;
											const difference = newARS - currentARS;

											return (
												<div
													key={budget.id}
													className="border-b border-border/50 pb-1 last:border-0 last:pb-0"
												>
													<div className="flex items-center justify-between mb-1">
														<span className="text-xs font-medium truncate flex-1 mr-2">
															#{budget.number || 'sin número'}
														</span>
														<Badge variant="outline" className="text-xs shrink-0">
															{budget.type || 'Otros'}
														</Badge>
													</div>
													<div className="grid grid-cols-2 gap-1 text-xs">
														<div className="text-right">
															<span className="text-muted-foreground">Actual: </span>
															<span className="font-medium">
																${currentARS.toLocaleString('es-AR')}
															</span>
														</div>
														<div className="text-right">
															<span className="text-muted-foreground">Nuevo: </span>
															<span className="font-medium text-green-600">
																${newARS.toLocaleString('es-AR')}
															</span>
														</div>
														<div className="col-span-2 text-right">
															<span className="text-muted-foreground">Diff: </span>
															<span
																className={`font-medium ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}
															>
																{difference >= 0 ? '+' : ''}${difference.toLocaleString('es-AR')}
															</span>
															<span className="text-muted-foreground ml-1">
																({(budget.amount_usd || 0).toFixed(2)} USD)
															</span>
														</div>
													</div>
												</div>
											);
										})}
									</div>

									{/* Totals */}
									<div className="bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg p-2">
										<h5 className="text-xs font-medium mb-1">Resumen:</h5>
										<div className="grid gap-1 text-xs">
											<div className="flex justify-between items-center">
												<span>Total actual:</span>
												<span className="font-medium">
													${summary.totalCurrentARS.toLocaleString('es-AR')} ARS
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span>Total nuevo:</span>
												<span className="font-medium text-green-600">
													${summary.totalNewARS.toLocaleString('es-AR')} ARS
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span>Diferencia:</span>
												<span
													className={`font-medium ${summary.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}
												>
													{summary.difference >= 0 ? '+' : ''}$
													{summary.difference.toLocaleString('es-AR')} ARS
												</span>
											</div>
											<div className="flex justify-between items-center text-xs text-muted-foreground">
												<span>Total USD:</span>
												<span>${summary.totalUSD.toFixed(2)} USD</span>
											</div>
										</div>
									</div>

									<Alert>
										<AlertCircle className="h-4 w-4" />
										<AlertDescription className="text-xs">
											El tipo de cambio se actualizará a $${currentRate.venta}
											<br />
											Los montos en USD se mantendrán fijos, los montos en pesos se ajustarán
											automáticamente.
										</AlertDescription>
									</Alert>
								</div>
							)}

							{updatableBudgets.length === 0 && (
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription className="text-xs">
										{budgetsWithUSD.length === 0
											? 'No hay presupuestos con monto USD para actualizar.'
											: lockedBudgets.length > 0
												? 'Todos los presupuestos con USD están marcados como vendidos o elegidos y no se pueden actualizar.'
												: 'No hay presupuestos actualizables.'}
									</AlertDescription>
								</Alert>
							)}
						</div>
					) : null}
				</div>

				<DialogFooter className="flex-shrink-0 border-t pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
						Cancelar
					</Button>
					<Button
						onClick={handleUpdate}
						disabled={!currentRate || isUpdating || isLoading || updatableBudgets.length === 0}
					>
						{isUpdating ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Actualizando...
							</>
						) : (
							`Actualizar ${updatableBudgets.length} presupuesto(s)`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
