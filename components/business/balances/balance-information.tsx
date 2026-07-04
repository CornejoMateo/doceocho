import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { formatCurrency, formatCurrencyUSD } from '@/utils/formats-money';
import { BalanceSummary } from '@/helpers/balances/balance-calculations';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateBalance } from '@/lib/balances/balances';
import { formatNumber, parseArsToNumber } from '@/utils/formats-money';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

interface BalanceInformationProps {
	balanceId: number;

	work?: {
		locality?: string | null;
		address?: string | null;
	} | null;

	startDate?: string | null;
	contractDateUsd?: number | null;
	usdCurrent?: number | null;

	totalPaid: number;
	totalPaidUsd: number;

	summary: BalanceSummary;

	formatDate: (dateStr: string | null | undefined) => string;

	onUpdated?: () => void;
}

export function BalanceInformation({
	balanceId,
	work,
	startDate,
	contractDateUsd,
	usdCurrent,
	totalPaid,
	totalPaidUsd,
	summary,
	formatDate,
	onUpdated,
}: BalanceInformationProps) {
	const [open, setOpen] = useState(false);

	const [arsValue, setArsValue] = useState(formatNumber(summary.budgetArsCurrent.toString()) || '');

	const [usdValue, setUsdValue] = useState(summary.budgetUsd?.toString() || '');

	const [loading, setLoading] = useState(false);

	const handleSave = async () => {
		try {
			setLoading(true);

			const { error } = await updateBalance(balanceId, {
				balance_amount_ars: arsValue ? parseArsToNumber(arsValue) : null,
				balance_amount_usd: usdValue ? Number(usdValue) : null,
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al actualizar presupuesto',
					description:
						translateError(error) ||
						'Hubo un problema al actualizar el presupuesto. Intente nuevamente.',
				});
				return;
			}

			toast({
				title: 'Presupuesto actualizado',
				description: 'El presupuesto ha sido actualizado exitosamente.',
			});

			setOpen(false);

			onUpdated?.();
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Error al actualizar el presupuesto';
			toast({
				variant: 'destructive',
				title: 'Error al actualizar presupuesto',
				description: translateError(errorMessage),
			});
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
				<div>
					<p className="text-xs text-muted-foreground mb-1">Obra</p>

					<p className="text-sm font-medium">
						{work ? (
							<>
								<span className="block">{work.locality}</span>

								<span className="text-xs text-muted-foreground">{work.address}</span>
							</>
						) : (
							'Sin obra asignada'
						)}
					</p>
				</div>

				<div>
					<p className="text-xs text-muted-foreground mb-1">Fecha de inicio</p>

					<p className="text-sm font-medium">{formatDate(startDate)}</p>
				</div>

				<div>
					<p className="text-xs text-muted-foreground mb-1">Dolar en fecha contratacion</p>

					<p className="text-sm font-bold text-blue-600">{formatCurrency(contractDateUsd)}</p>
				</div>

				<div>
					<p className="text-xs text-muted-foreground mb-1">Dolar actual</p>

					<p className="text-sm font-bold text-blue-600">{formatCurrency(usdCurrent)}</p>
				</div>

				<div>
					<p className="text-xs text-muted-foreground mb-1">Presupuesto contratado</p>

					<div className="flex flex-col">
						<p className="text-sm font-bold text-primary">
							{formatCurrency(summary.budgetArsInitial)}
						</p>

						<p className="text-xs text-muted-foreground">{formatCurrencyUSD(summary.budgetUsd)}</p>
					</div>
				</div>

				<div>
					<div className="flex items-center gap-2 mb-1">
						<p className="text-xs text-muted-foreground">Presupuesto actual</p>

						<button
							type="button"
							onClick={() => setOpen(true)}
							className="text-muted-foreground hover:text-primary transition-colors"
						>
							<Pencil className="w-3.5 h-3.5" />
						</button>
					</div>

					<div className="flex flex-col">
						<p className="text-sm font-bold text-primary">
							{formatCurrency(summary.budgetArsCurrent)}
						</p>

						<p className="text-xs text-muted-foreground">{formatCurrencyUSD(summary.budgetUsd)}</p>
					</div>
				</div>

				<div>
					<p className="text-xs text-muted-foreground mb-1">Entregado</p>

					<div className="flex flex-col">
						<p className="text-sm font-bold text-green-600">{formatCurrency(totalPaid)}</p>

						{usdCurrent && (
							<p className="text-xs text-muted-foreground">{formatCurrencyUSD(totalPaidUsd)}</p>
						)}
					</div>
				</div>

				<div>
					<p className="text-xs text-muted-foreground mb-1">Saldo</p>

					<div className="flex flex-col">
						<p className="text-sm font-bold text-orange-600">
							{formatCurrency(summary.remainingArs)}
						</p>

						<p className="text-xs text-muted-foreground">
							{formatCurrencyUSD(summary.remainingUsd)}
						</p>
					</div>
				</div>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Editar presupuesto actual</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Monto en pesos</label>

							<Input
								type="text"
								inputMode="numeric"
								value={arsValue}
								onChange={(e) => setArsValue(formatNumber(e.target.value))}
								placeholder="Ingrese monto en ARS"
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Monto en USD</label>

							<Input
								type="number"
								value={usdValue}
								onChange={(e) => setUsdValue(e.target.value)}
								placeholder="Ingrese monto en USD"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancelar
						</Button>

						<Button onClick={handleSave} disabled={loading}>
							{loading ? 'Guardando...' : 'Guardar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
