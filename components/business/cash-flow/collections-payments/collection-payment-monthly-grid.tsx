import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/utils/formats-money';
import { MONTH_LABELS_ES as MONTH_LABELS } from '@/helpers/fixed-expenses/fixed-expenses-summary';

type CollectionPaymentMonthlyGridProps = {
	entries: { date: string; amount: number }[];
	title: string;
};

// Reusable MES/MONTO grid for the selected year (Ene-Dic, zero-filled), with annual total.
export function CollectionPaymentMonthlyGrid({
	entries,
	title,
}: CollectionPaymentMonthlyGridProps) {
	const months = useMemo(() => {
		const totals = Array(12).fill(0);
		for (const entry of entries) {
			const monthIndex = Number(entry.date.slice(5, 7)) - 1;
			if (monthIndex >= 0 && monthIndex < 12) totals[monthIndex] += Number(entry.amount);
		}
		return totals;
	}, [entries]);

	const annualTotal = months.reduce((sum, value) => sum + value, 0);

	return (
		<Card className="bg-card border-border overflow-x-auto">
			<div className="px-4 pt-4">
				<h3 className="text-sm font-medium text-foreground">{title}</h3>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="text-center">Mes</TableHead>
						<TableHead className="text-center">Monto</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{MONTH_LABELS.map((label, index) => (
						<TableRow key={label}>
							<TableCell className="text-center">{label}</TableCell>
							<TableCell className="text-center">{formatCurrency(months[index])}</TableCell>
						</TableRow>
					))}
					<TableRow>
						<TableCell className="text-center font-semibold">Total anual</TableCell>
						<TableCell className="text-center font-semibold">
							{formatCurrency(annualTotal)}
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</Card>
	);
}
