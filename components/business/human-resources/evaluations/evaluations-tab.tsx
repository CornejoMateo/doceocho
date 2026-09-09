'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { StarRating } from '@/components/ui/star-rating';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { MessageSquare, Search, Star, Users } from 'lucide-react';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { paginateAndFilter } from '@/utils/pagination';
import { translateError } from '@/lib/error-translator';
import { MONTHS } from '@/constants/attendance/settlements';
import { EVALUATION_YEARS_BACK, RATING_LABELS } from '@/constants/human-resources/evaluations';
import { EMPLOYEES_PER_PAGE } from '@/constants/human-resources/employees';
import { Employee, getEmployeeFullName, listEmployees } from '@/lib/human-resources/employees';
import {
	EmployeeEvaluation,
	listEmployeeEvaluations,
} from '@/lib/human-resources/employee-evaluations';
import {
	buildEmployeeRanking,
	buildMonthlyAverages,
	findEvaluation,
	getPeriodStats,
	indexEvaluationsByPeriod,
} from '@/helpers/human-resources/evaluations';
import { EvaluationFormDialog } from '@/components/business/human-resources/evaluations/evaluation-form-dialog';
import { EvaluationsRanking } from '@/components/business/human-resources/evaluations/evaluations-ranking';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: EVALUATION_YEARS_BACK }, (_, index) =>
	(currentYear - index).toString()
);

export function EvaluationsTab() {
	const [year, setYear] = useState(currentYear.toString());
	const [month, setMonth] = useState(new Date().getMonth().toString());
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [employeeToEvaluate, setEmployeeToEvaluate] = useState<Employee | null>(null);

	const {
		data: employees,
		loading: loadingEmployees,
		error: employeesError,
	} = useOptimizedRealtime<Employee>(
		'employees',
		async () => {
			const { data, error } = await listEmployees();
			if (error) throw error;
			return data ?? [];
		},
		'employees_cache'
	);

	const {
		data: evaluations,
		loading: loadingEvaluations,
		error: evaluationsError,
		refresh: refreshEvaluations,
	} = useOptimizedRealtime<EmployeeEvaluation>(
		'employee_evaluations',
		async () => {
			const { data, error } = await listEmployeeEvaluations();
			if (error) throw error;
			return data ?? [];
		},
		'employee_evaluations_cache'
	);

	const period = useMemo(() => ({ year: Number(year), month: Number(month) }), [year, month]);

	// Only active employees are evaluated, but past evaluations stay in the ranking.
	const activeEmployees = useMemo(
		() => employees.filter((employee) => employee.status === 'Activo'),
		[employees]
	);

	const evaluationsIndex = useMemo(() => indexEvaluationsByPeriod(evaluations), [evaluations]);

	const stats = useMemo(
		() => getPeriodStats(activeEmployees, evaluations, period),
		[activeEmployees, evaluations, period]
	);

	const ranking = useMemo(
		() => buildEmployeeRanking(employees, evaluations, period),
		[employees, evaluations, period]
	);

	const monthlyAverages = useMemo(
		() => buildMonthlyAverages(evaluations, period.year),
		[evaluations, period.year]
	);

	const chartData = useMemo(
		() =>
			monthlyAverages.map((entry) => ({
				month: MONTHS[entry.month]?.label.slice(0, 3) ?? '',
				promedio: entry.average ?? 0,
				evaluados: entry.evaluatedCount,
			})),
		[monthlyAverages]
	);

	const {
		paginatedData: currentEmployees,
		totalPages,
		totalItems,
	} = useMemo(
		() =>
			paginateAndFilter(
				activeEmployees,
				searchTerm,
				currentPage,
				EMPLOYEES_PER_PAGE,
				(employee, search) =>
					employee.name?.toLowerCase().includes(search) ||
					employee.last_name?.toLowerCase().includes(search) ||
					employee.position?.toLowerCase().includes(search) ||
					false
			),
		[activeEmployees, searchTerm, currentPage]
	);

	const selectedEvaluation = employeeToEvaluate
		? findEvaluation(evaluationsIndex, employeeToEvaluate.id, period)
		: null;

	const loading = loadingEmployees || loadingEvaluations;
	const error = employeesError || evaluationsError;

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-xl font-bold text-foreground">Evaluación de empleados</h3>
				<p className="text-muted-foreground mt-1">
					Puntuación mensual con estrellas y observaciones de cada empleado
				</p>
			</div>

			<Card className="p-4 bg-card border-border">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="grid gap-2">
						<Label htmlFor="evaluation-year">Año</Label>
						<Select value={year} onValueChange={setYear}>
							<SelectTrigger id="evaluation-year">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{years.map((option) => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="evaluation-month">Mes</Label>
						<Select value={month} onValueChange={setMonth}>
							<SelectTrigger id="evaluation-month">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MONTHS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2 sm:col-span-2">
						<Label htmlFor="evaluation-search">Buscar</Label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="evaluation-search"
								placeholder="Buscar por nombre o puesto..."
								value={searchTerm}
								onChange={(event) => {
									setSearchTerm(event.target.value);
									setCurrentPage(1);
								}}
								className="pl-9 bg-background"
							/>
						</div>
					</div>
				</div>
			</Card>

			<div className="grid gap-4 sm:grid-cols-3">
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Promedio del mes</p>
							<p className="text-2xl font-bold text-foreground mt-2">
								{stats.average !== null ? stats.average.toFixed(1) : '—'}
							</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-1">
							<Star className="h-6 w-6" />
						</div>
					</div>
				</Card>
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Evaluados</p>
							<p className="text-2xl font-bold text-foreground mt-2">{stats.evaluated}</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-2">
							<Users className="h-6 w-6" />
						</div>
					</div>
				</Card>
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Pendientes</p>
							<p className="text-2xl font-bold text-foreground mt-2">{stats.pending}</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-3">
							<MessageSquare className="h-6 w-6" />
						</div>
					</div>
				</Card>
			</div>

			<Card className="p-4 sm:p-6 bg-card border-border">
				<div className="mb-4">
					<h4 className="font-semibold text-foreground">
						{MONTHS[period.month]?.label} {period.year}
					</h4>
					<p className="text-sm text-muted-foreground">
						Tocá las estrellas para puntuar o abrí la evaluación para agregar observaciones
					</p>
				</div>

				{loading && <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>}
				{error && !loading && (
					<p className="text-sm text-destructive py-6 text-center">
						Error al cargar las evaluaciones: {translateError(error)}
					</p>
				)}
				{!loading && !error && currentEmployees.length === 0 && (
					<p className="text-sm text-muted-foreground py-6 text-center">
						{searchTerm
							? `No se encontraron empleados con el término de búsqueda "${searchTerm}"`
							: 'No hay empleados activos para evaluar.'}
					</p>
				)}

				{!loading && !error && currentEmployees.length > 0 && (
					<div className="space-y-2">
						{currentEmployees.map((employee) => {
							const evaluation = findEvaluation(evaluationsIndex, employee.id, period);

							return (
								<div
									key={employee.id}
									className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
								>
									<div className="min-w-0">
										<p className="text-sm font-medium text-foreground truncate">
											{getEmployeeFullName(employee)}
										</p>
										<div className="flex items-center gap-2">
											{employee.position && (
												<p className="text-xs text-muted-foreground truncate">
													{employee.position}
												</p>
											)}
											{evaluation?.notes && (
												<MessageSquare
													className="h-3 w-3 text-muted-foreground flex-shrink-0"
													aria-label="Tiene observaciones"
												/>
											)}
										</div>
									</div>

									<div className="flex items-center gap-3 sm:justify-end">
										<StarRating
											value={evaluation?.rating ?? null}
											size="md"
											label={`Puntuación de ${getEmployeeFullName(employee)}`}
										/>
										{evaluation ? (
											<Badge variant="secondary" className="hidden sm:inline-flex">
												{RATING_LABELS[evaluation.rating]}
											</Badge>
										) : (
											<Badge variant="outline" className="hidden sm:inline-flex">
												Sin evaluar
											</Badge>
										)}
										<Button
											variant="outline"
											size="sm"
											onClick={() => setEmployeeToEvaluate(employee)}
										>
											{evaluation ? 'Editar' : 'Evaluar'}
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				)}

				<PaginationControls
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={totalItems}
					itemsPerPage={EMPLOYEES_PER_PAGE}
					onPageChange={setCurrentPage}
					itemLabel="empleados"
				/>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				<EvaluationsRanking rows={ranking} year={period.year} />

				<Card className="p-4 sm:p-6 bg-card border-border">
					<div className="mb-4">
						<h4 className="font-semibold text-foreground">Evolución {period.year}</h4>
						<p className="text-sm text-muted-foreground">Promedio general de cada mes del año</p>
					</div>
					<ResponsiveContainer width="100%" height={240}>
						<BarChart data={chartData}>
							<CartesianGrid strokeDasharray="3 3" className="stroke-border" />
							<XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
							<YAxis domain={[0, 5]} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
							<Tooltip
								formatter={(value) => `${Number(value).toFixed(1)} de 5`}
								contentStyle={{
									backgroundColor: 'var(--card)',
									border: '1px solid var(--border)',
									borderRadius: '0.5rem',
									color: 'var(--foreground)',
								}}
							/>
							<Bar dataKey="promedio" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</Card>
			</div>

			<EvaluationFormDialog
				employee={employeeToEvaluate}
				evaluation={selectedEvaluation}
				period={period}
				open={!!employeeToEvaluate}
				onOpenChange={(open) => !open && setEmployeeToEvaluate(null)}
				onSaved={refreshEvaluations}
			/>
		</div>
	);
}
