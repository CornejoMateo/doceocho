'use client';

import { AlertCircle } from 'lucide-react';
import { StatsCardsBalances } from '@/components/business/balances/stats-cards-balances';
import { BalancesTab } from '@/components/business/cash-flow/balances-tab/balances-tab';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useBalancesReport } from '@/hooks/balances/use-balances-report';

export function CheckingAccountsTab() {
	const { stats, error, hasRows, ...tabProps } = useBalancesReport();

	if (tabProps.initialLoading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-8" aria-label="Cargando cuentas corrientes" />
			</div>
		);
	}

	// Nothing to show yet: an error must not look like "no debts"
	if (error && !hasRows) {
		return (
			<Alert variant="destructive">
				<AlertCircle />
				<AlertTitle>No se pudieron cargar las cuentas corrientes</AlertTitle>
				<AlertDescription>
					<p>{error}</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => tabProps.refresh()}
						disabled={tabProps.loading}
					>
						Reintentar
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			{error && (
				<Alert variant="destructive">
					<AlertCircle />
					<AlertTitle>No se pudieron actualizar los datos</AlertTitle>
					<AlertDescription>Se muestran los últimos datos cargados. {error}</AlertDescription>
				</Alert>
			)}
			<StatsCardsBalances stats={stats} />
			<BalancesTab {...tabProps} />
		</div>
	);
}
