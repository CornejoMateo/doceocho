'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	FixedExpenseCategoryRow,
	FixedExpenseTotals,
} from '@/helpers/fixed-expenses/fixed-expenses-summary';
import { formatCurrency } from '@/utils/formats-money';

type FixedExpensesSummaryProps = {
	totals: FixedExpenseTotals;
	byCategory: FixedExpenseCategoryRow[];
};

export function FixedExpensesSummary({ totals, byCategory }: FixedExpensesSummaryProps) {
	return (
		<div className="space-y-4">
			<Card className="bg-card border-border">
				<CardHeader>
					<CardTitle className="text-base">Resumen automático</CardTitle>
				</CardHeader>
				<CardContent
					className="grid grid-cols-2 gap-3 text-sm"
					data-testid="fixed-expenses-summary-stats"
				>
					<SummaryStat label="Total neto" value={formatCurrency(totals.net)} />
					<SummaryStat label="Total IVA" value={formatCurrency(totals.iva)} />
					<SummaryStat label="Total mensual" value={formatCurrency(totals.total)} />
					<SummaryStat label="Cantidad" value={String(totals.count)} />
					<SummaryStat label="Promedio" value={formatCurrency(totals.average)} />
				</CardContent>
			</Card>

			<Card className="bg-card border-border">
				<CardHeader>
					<CardTitle className="text-base">Por categoría</CardTitle>
				</CardHeader>
				<CardContent>
					{byCategory.length === 0 ? (
						<p className="text-sm text-muted-foreground">No hay categorías de costos fijos</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-center">Categoría</TableHead>
										<TableHead className="text-center">Neto</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{byCategory.map((row) => (
										<TableRow key={row.categoryId}>
											<TableCell className="text-center">{row.categoryName}</TableCell>
											<TableCell className="text-center">{formatCurrency(row.net)}</TableCell>
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
