import { Employee } from '@/lib/human-resources/employees';
import { EmployeeEvaluation } from '@/lib/human-resources/employee-evaluations';

export type EvaluationPeriod = {
	year: number;
	/** 0 = enero ... 11 = diciembre. */
	month: number;
};

export type EmployeeRankingRow = {
	employee: Employee;
	/** Yearly average, null when the employee has no evaluation in the range. */
	average: number | null;
	/** How many months were evaluated. */
	evaluatedMonths: number;
	/** Rating for the selected period, null when not evaluated yet. */
	periodRating: number | null;
};

export type MonthlyAverage = {
	month: number;
	average: number | null;
	evaluatedCount: number;
};

function buildPeriodKey(employeeId: number, year: number, month: number): string {
	return `${employeeId}-${year}-${month}`;
}

/** Index evaluations by employee and period so lookups stay O(1). */
export function indexEvaluationsByPeriod(
	evaluations: EmployeeEvaluation[]
): Map<string, EmployeeEvaluation> {
	return new Map(
		evaluations.map((evaluation) => [
			buildPeriodKey(evaluation.employee_id, evaluation.year, evaluation.month),
			evaluation,
		])
	);
}

export function findEvaluation(
	index: Map<string, EmployeeEvaluation>,
	employeeId: number,
	period: EvaluationPeriod
): EmployeeEvaluation | null {
	return index.get(buildPeriodKey(employeeId, period.year, period.month)) ?? null;
}

export function average(values: number[]): number | null {
	if (values.length === 0) return null;

	const total = values.reduce((sum, value) => sum + value, 0);

	// Kept at one decimal, which is what the UI shows.
	return Math.round((total / values.length) * 10) / 10;
}

/**
 * Ranking for a year, ordered by average descending.
 * Employees without evaluations are pushed to the end instead of being dropped,
 * so it doubles as the list of who is still pending.
 */
export function buildEmployeeRanking(
	employees: Employee[],
	evaluations: EmployeeEvaluation[],
	period: EvaluationPeriod
): EmployeeRankingRow[] {
	const index = indexEvaluationsByPeriod(evaluations);

	const rows = employees.map((employee) => {
		const yearRatings = evaluations
			.filter(
				(evaluation) => evaluation.employee_id === employee.id && evaluation.year === period.year
			)
			.map((evaluation) => evaluation.rating);

		return {
			employee,
			average: average(yearRatings),
			evaluatedMonths: yearRatings.length,
			periodRating: findEvaluation(index, employee.id, period)?.rating ?? null,
		};
	});

	return rows.sort((a, b) => {
		if (a.average === null && b.average === null) {
			return a.employee.last_name.localeCompare(b.employee.last_name);
		}
		if (a.average === null) return 1;
		if (b.average === null) return -1;
		if (b.average !== a.average) return b.average - a.average;

		return b.evaluatedMonths - a.evaluatedMonths;
	});
}

/** Average per month across every employee, for the yearly trend. */
export function buildMonthlyAverages(
	evaluations: EmployeeEvaluation[],
	year: number
): MonthlyAverage[] {
	return Array.from({ length: 12 }, (_, month) => {
		const ratings = evaluations
			.filter((evaluation) => evaluation.year === year && evaluation.month === month)
			.map((evaluation) => evaluation.rating);

		return {
			month,
			average: average(ratings),
			evaluatedCount: ratings.length,
		};
	});
}

export function getPeriodStats(
	employees: Employee[],
	evaluations: EmployeeEvaluation[],
	period: EvaluationPeriod
): { average: number | null; evaluated: number; pending: number } {
	const ratings = evaluations
		.filter((evaluation) => evaluation.year === period.year && evaluation.month === period.month)
		.filter((evaluation) => employees.some((employee) => employee.id === evaluation.employee_id))
		.map((evaluation) => evaluation.rating);

	return {
		average: average(ratings),
		evaluated: ratings.length,
		pending: employees.length - ratings.length,
	};
}
