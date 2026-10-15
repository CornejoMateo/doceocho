import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formats-money';

type CollectionPaymentSummaryProps = {
	total: number;
	count: number;
	average: number;
	max: number;
};

// Vertical card for the sidebar column, mirrors fixed-expenses-summary's "Resumen automático" card.
export function CollectionPaymentSummary({
	total,
	count,
	average,
	max,
}: CollectionPaymentSummaryProps) {
	const items = [
		{ label: 'Total', value: formatCurrency(total) },
		{ label: 'Cantidad', value: String(count) },
		{ label: 'Promedio', value: formatCurrency(average) },
		{ label: 'Mayor', value: formatCurrency(max) },
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
