import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SummaryCards } from '@/helpers/cash-flow-stats/cash-flow-summary';
import { formatCurrency } from '@/utils/formats-money';

type SummaryKpisProps = {
	cards: SummaryCards;
};

export function SummaryKpis({ cards }: SummaryKpisProps) {
	return (
		<div
			className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
			data-testid="summary-kpis"
		>
			<Kpi label="Ingresos" value={formatCurrency(cards.incomeNet)} />
			<Kpi label="Gastos" value={formatCurrency(cards.expenseNet)} />
			<Kpi label="Gastos con IVA" value={formatCurrency(cards.expenseWithIva)} />
			<Kpi
				label="Debe"
				value={formatCurrency(cards.debe)}
				valueClassName={cards.debe > 0 ? 'text-destructive' : undefined}
				helpText="Gastos con IVA menos pagos"
			/>
			<Kpi label="Cobros" value={formatCurrency(cards.collections)} />
			<Kpi label="Pagos" value={formatCurrency(cards.payments)} />
			<Kpi
				label="IVA del mes (crédito − débito)"
				value={formatCurrency(cards.ivaOfMonth)}
				helpText="Positivo: IVA a pagar. Negativo: saldo a favor."
			/>
		</div>
	);
}

function Kpi({
	label,
	value,
	valueClassName,
	helpText,
}: {
	label: string;
	value: string;
	valueClassName?: string;
	helpText?: string;
}) {
	return (
		<Card className="bg-card border-border">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
			</CardHeader>
			<CardContent>
				<p className={`text-xl font-semibold ${valueClassName ?? ''}`}>{value}</p>
				{helpText && <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>}
			</CardContent>
		</Card>
	);
}
