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
import { computeIncomeExpenseByCategory } from '@/helpers/income-expense/income-expense-summary';
import type { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import { CashFlowCategory } from '@/lib/categories/categories';

type IncomeExpenseByCategoryProps = {
	entries: IncomeExpenseEntry[];
	categories: CashFlowCategory[];
};

export function IncomeExpenseByCategory({ entries, categories }: IncomeExpenseByCategoryProps) {
	const byCategory = useMemo(
		() => computeIncomeExpenseByCategory(entries, categories),
		[entries, categories]
	);
	const totalNet = useMemo(() => byCategory.reduce((sum, row) => sum + row.net, 0), [byCategory]);

	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-base">Por categoría</CardTitle>
			</CardHeader>
			<CardContent>
				{byCategory.length === 0 ? (
					<p className="text-sm text-muted-foreground">No hay categorías con movimientos</p>
				) : (
					<div className="max-h-72 overflow-y-auto overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-center">Categoría</TableHead>
									<TableHead className="text-center">Neto</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{byCategory.map((row) => (
									<TableRow key={row.categoryId ?? 'none'}>
										<TableCell className="text-center">{row.categoryName}</TableCell>
										<TableCell className="text-center">{formatCurrency(row.net)}</TableCell>
									</TableRow>
								))}
								<TableRow className="font-semibold">
									<TableCell className="text-center">Total</TableCell>
									<TableCell className="text-center">{formatCurrency(totalNet)}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
