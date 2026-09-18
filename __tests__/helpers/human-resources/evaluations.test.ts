import {
	average,
	buildEmployeeRanking,
	buildMonthlyAverages,
	findEvaluation,
	getPeriodStats,
	indexEvaluationsByPeriod,
} from '@/helpers/human-resources/evaluations';
import { Employee } from '@/lib/human-resources/employees';
import { EmployeeEvaluation } from '@/lib/human-resources/employee-evaluations';

function makeEmployee(id: number, lastName: string, status = 'Activo'): Employee {
	return {
		id,
		created_at: '2026-01-01T00:00:00Z',
		user_id: null,
		name: 'Test',
		last_name: lastName,
		identity_number: null,
		birth_date: null,
		phone_number: null,
		email: null,
		address: null,
		locality: null,
		position: null,
		hire_date: null,
		termination_date: null,
		status: status as Employee['status'],
		emergency_contact_name: null,
		emergency_contact_phone: null,
		notes: null,
	};
}

function makeEvaluation(
	id: number,
	employeeId: number,
	year: number,
	month: number,
	rating: number
): EmployeeEvaluation {
	return {
		id,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		employee_id: employeeId,
		year,
		month,
		rating,
		notes: null,
		evaluated_by: null,
	};
}

describe('helpers/human-resources/evaluations', () => {
	describe('average', () => {
		test('returns null for an empty list', () => {
			expect(average([])).toBeNull();
		});

		test('rounds to one decimal', () => {
			expect(average([5, 4, 4])).toBe(4.3);
			expect(average([1, 2])).toBe(1.5);
		});
	});

	describe('indexEvaluationsByPeriod / findEvaluation', () => {
		const evaluations = [makeEvaluation(1, 10, 2026, 0, 4), makeEvaluation(2, 10, 2026, 1, 2)];
		const index = indexEvaluationsByPeriod(evaluations);

		test('finds the evaluation for a period', () => {
			expect(findEvaluation(index, 10, { year: 2026, month: 1 })?.rating).toBe(2);
		});

		test('returns null when the employee was not evaluated that month', () => {
			expect(findEvaluation(index, 10, { year: 2026, month: 5 })).toBeNull();
			expect(findEvaluation(index, 99, { year: 2026, month: 0 })).toBeNull();
		});
	});

	describe('buildEmployeeRanking', () => {
		const employees = [
			makeEmployee(1, 'Alvarez'),
			makeEmployee(2, 'Benitez'),
			makeEmployee(3, 'Costa'),
		];
		const evaluations = [
			makeEvaluation(1, 1, 2026, 0, 3),
			makeEvaluation(2, 1, 2026, 1, 3),
			makeEvaluation(3, 2, 2026, 0, 5),
			makeEvaluation(4, 2, 2026, 1, 4),
			// Previous year, must not count towards the 2026 average.
			makeEvaluation(5, 3, 2025, 0, 5),
		];

		test('orders by yearly average descending', () => {
			const ranking = buildEmployeeRanking(employees, evaluations, { year: 2026, month: 0 });

			expect(ranking.map((row) => row.employee.id)).toEqual([2, 1, 3]);
			expect(ranking[0].average).toBe(4.5);
			expect(ranking[1].average).toBe(3);
		});

		test('keeps employees without evaluations at the end', () => {
			const ranking = buildEmployeeRanking(employees, evaluations, { year: 2026, month: 0 });

			expect(ranking[2].average).toBeNull();
			expect(ranking[2].evaluatedMonths).toBe(0);
		});

		test('exposes the rating of the selected period', () => {
			const ranking = buildEmployeeRanking(employees, evaluations, { year: 2026, month: 1 });

			expect(ranking.find((row) => row.employee.id === 1)?.periodRating).toBe(3);
			expect(ranking.find((row) => row.employee.id === 3)?.periodRating).toBeNull();
		});
	});

	describe('buildMonthlyAverages', () => {
		test('returns one entry per month of the year', () => {
			const averages = buildMonthlyAverages(
				[makeEvaluation(1, 1, 2026, 0, 4), makeEvaluation(2, 2, 2026, 0, 2)],
				2026
			);

			expect(averages).toHaveLength(12);
			expect(averages[0]).toEqual({ month: 0, average: 3, evaluatedCount: 2 });
			expect(averages[1]).toEqual({ month: 1, average: null, evaluatedCount: 0 });
		});
	});

	describe('getPeriodStats', () => {
		const employees = [makeEmployee(1, 'Alvarez'), makeEmployee(2, 'Benitez')];

		test('counts evaluated and pending employees', () => {
			const stats = getPeriodStats(employees, [makeEvaluation(1, 1, 2026, 3, 5)], {
				year: 2026,
				month: 3,
			});

			expect(stats).toEqual({ average: 5, evaluated: 1, pending: 1 });
		});

		test('ignores evaluations of employees outside the list', () => {
			const stats = getPeriodStats(employees, [makeEvaluation(1, 99, 2026, 3, 5)], {
				year: 2026,
				month: 3,
			});

			expect(stats).toEqual({ average: null, evaluated: 0, pending: 2 });
		});
	});
});
