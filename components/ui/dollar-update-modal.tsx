'use client';

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
import { Loader2, TrendingUp, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BalanceWithTotals } from '@/components/business/balances/client-balances';

interface DollarRate {
	moneda: string;
	casa: string;
	nombre: string;
	compra: number;
	venta: number;
	fechaActualizacion: string;
}

interface DollarUpdateModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	balance: BalanceWithTotals | null;
	onUpdateConfirmed: (newUsdRate: number, newAmountArs: number) => Promise<void>;
}

export function DollarUpdateModal({
	isOpen,
	onOpenChange,
	balance,
	onUpdateConfirmed,
}: DollarUpdateModalProps) {
	const [currentRate, setCurrentRate] = useState<DollarRate | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchCurrentRate = async () => {
		try {
			setIsLoading(true);
			setError(null);
			const response = await fetch('/api/dollar-rate');

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
		if (!currentRate || !balance) return;

		if (!newValues) return;

		try {
			setIsUpdating(true);

			const response = await fetch('/api/dollar-rate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					balanceId: balance.id,
					newUsdRate: currentRate.venta,
					newBalanceAmountARS: newValues.newBudgetInARS,
				}),
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Error al actualizar el tipo de cambio');
			}

			await onUpdateConfirmed(currentRate.venta, newValues.newBudgetInARS);
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al actualizar');
		} finally {
			setIsUpdating(false);
		}
	};

	const calculateNewValues = () => {
		if (!currentRate || !balance) return null;

		// Get the budget in ARS and USD from the budget relation
		const budgetInARS = balance.balance_amount_ars || 0;
		const budgetInUSD = balance.balance_amount_usd || 0;
		const newBudgetInARS = (budgetInUSD || 0) * currentRate.venta;

		// For paid and remaining, we need to calculate their USD equivalents first
		const totalPaidInUSD = balance.totalPaidUSD || 0;
		const totalPaidInARS = balance.totalPaid || 0;

		const remainingInUSD = balance.remainingUSD || 0;
		const remainingInARS = balance.remaining || 0;
		const newRemainingInARS = newBudgetInARS - totalPaidInARS;

		return {
			budgetInUSD,
			budgetInARS,
			newBudgetInARS,
			totalPaidInARS,
			totalPaidInUSD,
			remainingInUSD,
			newRemainingInARS,
			remainingInARS,
		};
	};

	const newValues = calculateNewValues();

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
						Actualizar Precios con Dólar Actual
					</DialogTitle>
					<DialogDescription>
						Actualice los valores de la cuenta corriente con el tipo de cambio oficial del día
					</DialogDescription>
				</DialogHeader>

				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span className="ml-2">Obteniendo cotización...</span>
					</div>
				) : currentRate ? (
					<div className="space-y-4">
						{/* Current Rate Info */}
						<div className="bg-secondary/50 rounded-lg p-4">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium">Dólar Oficial</span>
								<Badge variant="outline" className="text-xs">
									Vigente
								</Badge>
							</div>
							<div className="flex items-center gap-2">
								<DollarSign className="h-4 w-4 text-primary" />
								<span className="text-2xl font-bold">
									${currentRate.venta.toLocaleString('es-AR')}
								</span>
							</div>
							<div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
								<Calendar className="h-3 w-3" />
								Actualizado:{' '}
								{format(new Date(currentRate.fechaActualizacion), 'dd/MM/yyyy HH:mm', {
									locale: es,
								})}
							</div>
						</div>

						{/* Comparison */}
						{balance?.contract_date_usd && newValues && (
							<div className="space-y-3">
								<h4 className="text-sm font-medium">Cambios en los valores:</h4>

								<div className="grid gap-2 text-sm">
									<div className="flex justify-between items-center">
										<span>Presupuesto:</span>
										<div className="text-right">
											<div className="font-medium">
												${(newValues.budgetInARS || 0).toLocaleString('es-AR')} → $
												{newValues.newBudgetInARS.toLocaleString('es-AR')}
											</div>
											<div className="text-xs text-muted-foreground">
												{newValues.budgetInUSD.toFixed(2)} USD (Sin modificación)
											</div>
										</div>
									</div>

									<div className="flex justify-between items-center">
										<span>Entregado:</span>
										<div className="text-right">
											<div className="font-medium">Sin modificación</div>
										</div>
									</div>

									<div className="flex justify-between items-center">
										<span>Debe:</span>
										<div className="text-right">
											<div className="font-medium">
												${(newValues.remainingInARS || 0).toLocaleString('es-AR')} → $
												{newValues.newRemainingInARS.toLocaleString('es-AR')}
											</div>
											<div className="text-xs text-muted-foreground">
												{newValues.remainingInUSD.toFixed(2)} USD (Sin modificación)
											</div>
										</div>
									</div>
								</div>

								{balance.usd_current !== currentRate.venta && (
									<Alert>
										<AlertCircle className="h-4 w-4" />
										<AlertDescription className="text-xs">
											El tipo de cambio cambiará de ${balance.usd_current} a ${currentRate.venta}
											<br />
											El presupuesto en USD se mantendrá fijo, el presupuesto en pesos se ajustará
											automáticamente.
										</AlertDescription>
									</Alert>
								)}
							</div>
						)}
					</div>
				) : null}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
						Cancelar
					</Button>
					<Button onClick={handleUpdate} disabled={!currentRate || isUpdating || isLoading}>
						{isUpdating ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Actualizando...
							</>
						) : (
							'Confirmar Actualización'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
