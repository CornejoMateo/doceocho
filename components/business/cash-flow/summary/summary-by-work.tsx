import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { WorkResultRow } from '@/helpers/cash-flow-stats/cash-flow-summary';
import { formatCurrency } from '@/utils/formats-money';

type SummaryByWorkProps = {
	rows: WorkResultRow[];
};

export function SummaryByWork({ rows }: SummaryByWorkProps) {
	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-base">Resultado por obra</CardTitle>
			</CardHeader>
			<CardContent>
				{rows.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No hay obras con movimientos en el período seleccionado
					</p>
				) : (
					<div className="overflow-x-auto">
						<Table data-testid="summary-by-work-table">
							<TableHeader>
								<TableRow>
									<TableHead>Obra</TableHead>
									<TableHead className="text-right">Ingresos</TableHead>
									<TableHead className="text-right">Gastos</TableHead>
									<TableHead className="text-right">Resultado</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((row) => (
									<TableRow key={row.workId}>
										<TableCell className="font-medium">{row.workName}</TableCell>
										<TableCell className="text-right">{formatCurrency(row.incomeNet)}</TableCell>
										<TableCell className="text-right">{formatCurrency(row.expenseNet)}</TableCell>
										<TableCell className={`text-right ${row.result < 0 ? 'text-destructive' : ''}`}>
											{formatCurrency(row.result)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
