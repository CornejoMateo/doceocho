import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formats-money';

type IncomeExpenseSummaryProps = {
	totalNet: number;
	totalIva: number;
	totalGross: number;
	count: number;
	average: number;
};

export function IncomeExpenseSummary({
	totalNet,
	totalIva,
	totalGross,
	count,
	average,
}: IncomeExpenseSummaryProps) {
	const items = [
		{ label: 'Total neto', value: formatCurrency(totalNet) },
		{ label: 'Total IVA', value: formatCurrency(totalIva) },
		{ label: 'Total c/IVA', value: formatCurrency(totalGross) },
		{ label: 'Cantidad', value: String(count) },
		{ label: 'Promedio', value: formatCurrency(average) },
	];

	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-base">Resumen</CardTitle>
			</CardHeader>
			<CardContent className="grid grid-cols-2 gap-3 text-sm">
				{items.map((item) => (
					<div key={item.label} className="space-y-1 text-center">
						<p className="text-muted-foreground">{item.label}</p>
						<p className="font-semibold">{item.value}</p>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
