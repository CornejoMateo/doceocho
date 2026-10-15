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
import { MonthlyChartPoint } from '@/helpers/cash-flow-stats/cash-flow-summary';
import { formatCurrency } from '@/utils/formats-money';

type SummaryMonthlyChartProps = {
	data: MonthlyChartPoint[];
	selectedMonth: number; // 0 = Todos, no month highlighted
};

export function SummaryMonthlyChart({ data, selectedMonth }: SummaryMonthlyChartProps) {
	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-base">Ingresos vs Gastos por mes</CardTitle>
			</CardHeader>
			<CardContent data-testid="summary-monthly-chart">
				<ResponsiveContainer width="100%" height={320}>
					<BarChart data={data}>
						<CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
						<XAxis dataKey="label" />
						<YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={90} />
						<Tooltip formatter={(value) => formatCurrency(Number(value))} />
						<Legend />
						<Bar dataKey="incomeNet" name="Ingresos" fill="#16a34a">
							{data.map((point) => (
								<Cell
									key={`income-${point.month}`}
									fillOpacity={point.month === selectedMonth ? 1 : 0.6}
								/>
							))}
						</Bar>
						<Bar dataKey="expenseNet" name="Gastos" fill="#dc2626">
							{data.map((point) => (
								<Cell
									key={`expense-${point.month}`}
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
