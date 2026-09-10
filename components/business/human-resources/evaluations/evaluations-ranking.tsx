'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { Trophy } from 'lucide-react';
import { getEmployeeFullName } from '@/lib/human-resources/employees';
import { EmployeeRankingRow } from '@/helpers/human-resources/evaluations';

const MEDAL_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-700'] as const;

interface EvaluationsRankingProps {
	rows: EmployeeRankingRow[];
	year: number;
}

export function EvaluationsRanking({ rows, year }: EvaluationsRankingProps) {
	const rankedRows = rows.filter((row) => row.average !== null);

	return (
		<Card className="p-4 sm:p-6 bg-card border-border">
			<div className="mb-4">
				<h4 className="font-semibold text-foreground">Ranking {year}</h4>
				<p className="text-sm text-muted-foreground">
					Promedio de todas las evaluaciones cargadas en el año
				</p>
			</div>

			{rankedRows.length === 0 ? (
				<p className="text-sm text-muted-foreground py-6 text-center">
					Todavía no hay evaluaciones cargadas en {year}.
				</p>
			) : (
				<div className="space-y-2">
					{rankedRows.map((row, index) => (
						<div
							key={row.employee.id}
							className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary flex-shrink-0">
									{index < MEDAL_COLORS.length ? (
										<Trophy className={`h-4 w-4 ${MEDAL_COLORS[index]}`} />
									) : (
										<span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
									)}
								</div>
								<div className="min-w-0">
									<p className="text-sm font-medium text-foreground truncate">
										{getEmployeeFullName(row.employee)}
									</p>
									<p className="text-xs text-muted-foreground">
										{row.evaluatedMonths} {row.evaluatedMonths === 1 ? 'mes' : 'meses'} evaluado
										{row.evaluatedMonths === 1 ? '' : 's'}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3 sm:justify-end">
								<StarRating value={Math.round(row.average ?? 0)} size="sm" />
								<Badge variant="secondary">{row.average?.toFixed(1)}</Badge>
							</div>
						</div>
					))}
				</div>
			)}
		</Card>
	);
}
