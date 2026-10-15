'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	FixedExpensePaymentCategoryRow,
	FixedExpensePaymentMonthRow,
	FixedExpensePaymentTotals,
	MONTH_LABELS_ES,
} from '@/helpers/fixed-expenses/fixed-expenses-summary';
import { formatCurrency } from '@/utils/formats-money';

type FixedExpensesSummaryProps = {
	year: number;
	totals: FixedExpensePaymentTotals;
	byMonth: FixedExpensePaymentMonthRow[];
	byCategory: FixedExpensePaymentCategoryRow[];
	loading: boolean;
	error: string | null;
	onRetry: () => void;
};

export function FixedExpensesSummary({
	year,
	totals,
	byMonth,
	byCategory,
	loading,
	error,
	onRetry,
}: FixedExpensesSummaryProps) {
	return (
		<div className="space-y-4">
			{error ? (
				<Alert variant="destructive">
					<AlertCircle />
					<AlertTitle>No se pudo cargar el resumen</AlertTitle>
					<AlertDescription className="space-y-2">
						<p>{error}</p>
						<Button variant="outline" size="sm" onClick={onRetry} disabled={loading}>
							Reintentar
						</Button>
					</AlertDescription>
				</Alert>
			) : loading ? (
				<div className="flex justify-center py-8">
					<Spinner className="size-8" aria-label="Cargando resumen" />
				</div>
			) : (
				<>
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
							<SummaryStat label="Total c/IVA" value={formatCurrency(totals.total)} />
							<SummaryStat label="Cantidad" value={String(totals.count)} />
							<SummaryStat label="Promedio" value={formatCurrency(totals.average)} />
						</CardContent>
					</Card>

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
				</>
			)}
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
