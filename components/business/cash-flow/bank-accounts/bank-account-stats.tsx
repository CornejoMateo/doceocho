'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { BankAccount } from '@/lib/cash-flow/cash-flow';
import { getAccountTypeLabel } from '@/constants/cashflow/cashflow';
import {
	buildAccountBalanceRows,
	buildAccountPeriodRows,
	buildPaymentMethodPeriodRows,
	sumPeriodTotals,
} from '@/helpers/cash-flow-stats/cash-flow-stats';
import { formatCurrency } from '@/utils/formats-money';
import { useBankAccountStats } from '@/hooks/cash-flow-stats/use-bank-account-stats';

type BankAccountStatsProps = {
	bankAccounts: BankAccount[];
};

export function BankAccountStats({ bankAccounts }: BankAccountStatsProps) {
	const state = useBankAccountStats(bankAccounts);

	if (state.error) {
		return (
			<Alert variant="destructive">
				<AlertCircle />
				<AlertTitle>No se pudieron cargar las estadísticas</AlertTitle>
				<AlertDescription className="space-y-2">
					<p>{state.error}</p>
					<Button variant="outline" size="sm" onClick={state.retry} disabled={state.loading}>
						Reintentar
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	if (state.loading) {
		return (
			<div className="flex justify-center py-8">
				<Spinner className="size-8" aria-label="Cargando estadísticas" />
			</div>
		);
	}

	const balanceSummary = buildAccountBalanceRows(state.bankAccounts, state.allTimeByAccount);
	const periodByAccount = buildAccountPeriodRows(
		state.bankAccounts,
		state.periodByAccount,
		balanceSummary.rows
	);
	const periodByMethod = buildPaymentMethodPeriodRows(state.paymentMethods, state.periodByMethod);
	const periodSummary = sumPeriodTotals(state.periodByAccount);

	return (
		<div className="space-y-4">
			<Card className="bg-card border-border">
				<CardHeader>
					<CardTitle className="text-base">Saldos por cuenta</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table data-testid="account-balances-table">
							<TableHeader>
								<TableRow>
									<TableHead>Cuenta</TableHead>
									<TableHead>Tipo</TableHead>
									<TableHead className="text-right">Saldo inicial</TableHead>
									<TableHead className="text-right">Ingresos</TableHead>
									<TableHead className="text-right">Egresos</TableHead>
									<TableHead className="text-right">Saldo actual</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{balanceSummary.rows.map((row) => (
									<TableRow key={row.accountId ?? 'sin-cuenta'}>
										<TableCell className="font-medium">{row.name}</TableCell>
										<TableCell>{row.type ? getAccountTypeLabel(row.type) : '-'}</TableCell>
										<TableCell className="text-right">
											{formatCurrency(row.initialBalance)}
										</TableCell>
										<TableCell className="text-right">{formatCurrency(row.incomes)}</TableCell>
										<TableCell className="text-right">{formatCurrency(row.expenses)}</TableCell>
										<TableCell className="text-right">
											{formatCurrency(row.currentBalance)}
										</TableCell>
									</TableRow>
								))}
								<TableRow className="font-semibold">
									<TableCell>TOTALES</TableCell>
									<TableCell />
									<TableCell className="text-right">
										{formatCurrency(balanceSummary.totals.initialBalance)}
									</TableCell>
									<TableCell className="text-right">
										{formatCurrency(balanceSummary.totals.incomes)}
									</TableCell>
									<TableCell className="text-right">
										{formatCurrency(balanceSummary.totals.expenses)}
									</TableCell>
									<TableCell className="text-right">
										{formatCurrency(balanceSummary.totals.currentBalance)}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			<Card className="bg-card border-border">
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<CardTitle className="text-base">Resumen mensual de caja y bancos</CardTitle>
					<div className="flex gap-2">
						<Select value={String(state.month)} onValueChange={(v) => state.setMonth(Number(v))}>
							<SelectTrigger className="w-32" aria-label="Mes">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{state.monthOptions.map((option) => (
									<SelectItem key={option.value} value={String(option.value)}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={String(state.year)} onValueChange={(v) => state.setYear(Number(v))}>
							<SelectTrigger className="w-28" aria-label="Año">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{state.yearOptions.map((option) => (
									<SelectItem key={option} value={String(option)}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardHeader>
				<CardContent
					className="grid grid-cols-1 gap-3 sm:grid-cols-3"
					data-testid="period-summary-stats"
				>
					<SummaryStat label="Ingresos del período" value={formatCurrency(periodSummary.incomes)} />
					<SummaryStat label="Egresos del período" value={formatCurrency(periodSummary.expenses)} />
					<SummaryStat
						label="Flujo neto del período"
						value={formatCurrency(periodSummary.netFlow)}
					/>
				</CardContent>
			</Card>

			<Card className="bg-card border-border">
				<CardHeader>
					<CardTitle className="text-base">Movimientos del período por cuenta</CardTitle>
				</CardHeader>
				<CardContent>
					{periodByAccount.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No hay movimientos en el período seleccionado
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table data-testid="period-by-account-table">
								<TableHeader>
									<TableRow>
										<TableHead>Cuenta</TableHead>
										<TableHead className="text-right">Ingresos</TableHead>
										<TableHead className="text-right">Egresos</TableHead>
										<TableHead className="text-right">Flujo neto</TableHead>
										<TableHead className="text-right">Saldo actual</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{periodByAccount.map((row) => (
										<TableRow key={row.accountId ?? 'sin-cuenta'}>
											<TableCell className="font-medium">{row.name}</TableCell>
											<TableCell className="text-right">{formatCurrency(row.incomes)}</TableCell>
											<TableCell className="text-right">{formatCurrency(row.expenses)}</TableCell>
											<TableCell className="text-right">{formatCurrency(row.netFlow)}</TableCell>
											<TableCell className="text-right">
												{formatCurrency(row.currentBalance)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="bg-card border-border">
				<CardHeader>
					<CardTitle className="text-base">Movimientos del período por medio de pago</CardTitle>
				</CardHeader>
				<CardContent>
					{periodByMethod.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No hay movimientos en el período seleccionado
						</p>
					) : (
						<div className="overflow-x-auto">
							<Table data-testid="period-by-method-table">
								<TableHeader>
									<TableRow>
										<TableHead>Medio</TableHead>
										<TableHead className="text-right">Ingresos</TableHead>
										<TableHead className="text-right">Egresos</TableHead>
										<TableHead className="text-right">Flujo neto</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{periodByMethod.map((row) => (
										<TableRow key={row.methodId ?? 'sin-medio'}>
											<TableCell className="font-medium">{row.name}</TableCell>
											<TableCell className="text-right">{formatCurrency(row.incomes)}</TableCell>
											<TableCell className="text-right">{formatCurrency(row.expenses)}</TableCell>
											<TableCell className="text-right">{formatCurrency(row.netFlow)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function SummaryStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1 text-center">
			<p className="text-muted-foreground">{label}</p>
			<p className="font-semibold">{value}</p>
		</div>
	);
}
