import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyCollectionsPaymentsPoint } from '@/helpers/cash-flow-stats/cash-flow-summary';
import { formatCurrency } from '@/utils/formats-money';

type SummaryMonthlyChartProps = {
	data: MonthlyCollectionsPaymentsPoint[];
	selectedMonth: number; // 0 = Todos, no month highlighted
};

export function SummaryMonthlyChart({ data, selectedMonth }: SummaryMonthlyChartProps) {
	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-base">Cobros vs Pagos por mes</CardTitle>
			</CardHeader>
			<CardContent data-testid="summary-monthly-chart">
				<ResponsiveContainer width="100%" height={320}>
					<BarChart data={data}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
						<XAxis dataKey="label" />
						<YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={90} />
						<Tooltip formatter={(value) => formatCurrency(Number(value))} />
						<Legend />
						<Bar dataKey="collections" name="Cobros" fill="#16a34a">
							{data.map((point) => (
								<Cell
									key={`collections-${point.month}`}
									fillOpacity={point.month === selectedMonth ? 1 : 0.6}
								/>
							))}
						</Bar>
						<Bar dataKey="payments" name="Pagos" fill="#dc2626">
							{data.map((point) => (
								<Cell
									key={`payments-${point.month}`}
									fillOpacity={point.month === selectedMonth ? 1 : 0.6}
								/>
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
