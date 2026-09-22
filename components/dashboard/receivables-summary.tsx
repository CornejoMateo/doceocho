'use client';

import Link from 'next/link';
import { ArrowUpRight, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formats-money';
import { PENDING_ACTION_ROUTES } from '@/constants/dashboard/dashboard';
import type { Receivables } from '@/helpers/dashboard/receivables';

interface ReceivablesSummaryProps {
	receivables: Receivables;
	isLoading: boolean;
}

/**
 * What is still to be collected, across every open account.
 * Until now this number only existed inside the balances report, several
 * clicks away from the screen everyone opens first.
 */
export function ReceivablesSummary({ receivables, isLoading }: ReceivablesSummaryProps) {
	const { totalArs, balancesCount, clientsCount } = receivables;

	return (
		<Link href={PENDING_ACTION_ROUTES.receivables} className="group block">
			<Card className="p-6 transition-colors hover:border-primary/50">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="text-sm font-medium text-muted-foreground">Por cobrar</p>
						{isLoading ? (
							<p className="mt-2 text-sm text-muted-foreground">Calculando...</p>
						) : (
							<>
								<p className="mt-2 text-2xl font-bold text-foreground">
									{formatCurrency(totalArs)}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{balancesCount === 0
										? 'No hay saldos pendientes de cobro'
										: `${balancesCount} ${balancesCount === 1 ? 'saldo' : 'saldos'} de ${clientsCount} ${clientsCount === 1 ? 'cliente' : 'clientes'}`}
								</p>
							</>
						)}
					</div>
					<div className="flex items-center gap-2">
						<div className="rounded-lg bg-secondary p-3 text-chart-1">
							<Wallet className="h-6 w-6" />
						</div>
						<ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
					</div>
				</div>
			</Card>
		</Link>
	);
}
