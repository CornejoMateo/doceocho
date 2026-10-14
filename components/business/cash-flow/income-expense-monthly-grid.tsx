import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/utils/formats-money';
import {
	computeIncomeExpenseByMonth,
	MONTH_LABELS_ES,
} from '@/helpers/income-expense/income-expense-summary';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';

type IncomeExpenseMonthlyGridProps = {
	entries: IncomeExpenseEntry[];
	year: number;
};

export function IncomeExpenseMonthlyGrid({ entries, year }: IncomeExpenseMonthlyGridProps) {
	const byMonth = useMemo(() => computeIncomeExpenseByMonth(entries), [entries]);
	const totals = useMemo(
		() =>
			byMonth.reduce(
				(acc, row) => ({
					net: acc.net + row.net,
					iva: acc.iva + row.iva,
					total: acc.total + row.total,
				}),
				{ net: 0, iva: 0, total: 0 }
			),
		[byMonth]
	);

	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-base">Por mes ({year})</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="text-center">Mes</TableHead>
								<TableHead className="text-center">Neto</TableHead>
								<TableHead className="text-center">IVA</TableHead>
								<TableHead className="text-center">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{byMonth.map((row) => (
								<TableRow key={row.month}>
									<TableCell className="text-center">{MONTH_LABELS_ES[row.month]}</TableCell>
									<TableCell className="text-center">{formatCurrency(row.net)}</TableCell>
									<TableCell className="text-center">{formatCurrency(row.iva)}</TableCell>
									<TableCell className="text-center">{formatCurrency(row.total)}</TableCell>
								</TableRow>
							))}
							<TableRow className="font-semibold">
								<TableCell className="text-center">Total</TableCell>
								<TableCell className="text-center">{formatCurrency(totals.net)}</TableCell>
								<TableCell className="text-center">{formatCurrency(totals.iva)}</TableCell>
								<TableCell className="text-center">{formatCurrency(totals.total)}</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
			</CardContent>
		</Card>
	);
}
