'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectLabel,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import {
	STATUS_LABELS,
	MAX_LAST_MONTHS,
	defaultFilters,
	type BudgetFilter,
	type PeriodFilter,
	type DateRange,
	type FilterOption,
	type FilterOptions,
	type MultiSelectDimension,
	type WorksFilters,
} from '@/lib/works/metrics';
import { MultiSelect } from './multi-select';
import {
	DIMENSION_FIELD,
	DIMENSION_LABELS,
	decodePeriod,
	encodePeriod,
	getFilterChips,
} from './filter-model';

interface WorksFiltersBarProps {
	filters: WorksFilters;
	onChange: (next: WorksFilters) => void;
	options: FilterOptions;
	resultCount: number;
	totalCount: number;
	actions?: React.ReactNode;
}

/** Every known status stays selectable, even at zero works. */
function statusOptions(options: FilterOptions): FilterOption[] {
	const known = Object.keys(STATUS_LABELS).map((value) => ({
		value,
		label: STATUS_LABELS[value],
		count: options.status.find((o) => o.value === value)?.count ?? 0,
	}));
	const extra = options.status.filter((o) => !(o.value in STATUS_LABELS));
	return [...known, ...extra];
}

function PeriodSelect({
	id,
	legend,
	value,
	years,
	onChange,
}: {
	id: string;
	legend: string;
	value: PeriodFilter;
	years: number[];
	onChange: (next: PeriodFilter) => void;
}) {
	// A selected year stays listed even if no work has it anymore.
	const yearList =
		value.mode === 'year' && !years.includes(value.year)
			? [...years, value.year].sort((a, b) => b - a)
			: years;
	return (
		<div className="space-y-1.5">
			<label htmlFor={id} className="text-xs font-medium text-muted-foreground">
				Período
			</label>
			<Select value={encodePeriod(value)} onValueChange={(v) => onChange(decodePeriod(v))}>
				<SelectTrigger id={id} className="w-full" aria-label={`Período de ${legend.toLowerCase()}`}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">Sin período</SelectItem>
					<SelectGroup>
						<SelectLabel>Año</SelectLabel>
						{yearList.map((y) => (
							<SelectItem key={y} value={`year:${y}`}>
								{y}
							</SelectItem>
						))}
					</SelectGroup>
					<SelectGroup>
						<SelectLabel>Últimos meses (incluye el actual)</SelectLabel>
						{Array.from({ length: MAX_LAST_MONTHS }, (_, i) => i + 1).map((n) => (
							<SelectItem key={n} value={`last:${n}`}>
								Últimos {n} {n === 1 ? 'mes' : 'meses'}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}

function DateRangeField({
	legend,
	value,
	onChange,
	period,
	years,
	onPeriodChange,
}: {
	legend: string;
	value: DateRange;
	onChange: (next: DateRange) => void;
	period: PeriodFilter;
	years: number[];
	onPeriodChange: (next: PeriodFilter) => void;
}) {
	const inverted = !!value.from && !!value.to && value.from > value.to;
	const clear = (key: 'from' | 'to') => (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="h-9 w-9 shrink-0"
			aria-label={`Quitar fecha ${key === 'from' ? 'desde' : 'hasta'} de ${legend.toLowerCase()}`}
			disabled={!value[key]}
			onClick={() => onChange({ ...value, [key]: '' })}
		>
			<X className="h-4 w-4" />
		</Button>
	);
	return (
		<fieldset className="space-y-1.5">
			<legend className="text-sm font-medium text-foreground">{legend}</legend>
			<PeriodSelect
				id={`works-filter-period-${legend}`}
				legend={legend}
				value={period}
				years={years}
				onChange={onPeriodChange}
			/>
			<div className="flex items-center gap-1">
				<DatePicker
					value={value.from}
					placeholder="Desde"
					onChange={(from) => onChange({ ...value, from })}
				/>
				{clear('from')}
			</div>
			<div className="flex items-center gap-1">
				<DatePicker
					value={value.to}
					placeholder="Hasta"
					onChange={(to) => onChange({ ...value, to })}
				/>
				{clear('to')}
			</div>
			{inverted && (
				<p role="alert" className="text-xs text-destructive">
					La fecha desde es posterior a la fecha hasta. Corregí el rango para ver obras.
				</p>
			)}
		</fieldset>
	);
}

const SEARCH_DEBOUNCE_MS = 250;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="space-y-3">
			<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				{title}
			</h3>
			{children}
		</section>
	);
}

export function WorksFiltersBar({
	filters,
	onChange,
	options,
	resultCount,
	totalCount,
	actions,
}: WorksFiltersBarProps) {
	const [open, setOpen] = useState(false);
	const chips = useMemo(() => getFilterChips(filters, options), [filters, options]);
	const patch = (partial: Partial<WorksFilters>) => onChange({ ...filters, ...partial });

	// The search box stays responsive; the shared filters (and every chart) update after a pause.
	const [searchText, setSearchText] = useState(filters.search);
	const filtersRef = useRef(filters);
	filtersRef.current = filters;
	const lastEmitted = useRef(filters.search);
	useEffect(() => {
		if (filters.search !== lastEmitted.current) {
			lastEmitted.current = filters.search;
			setSearchText(filters.search); // changed from outside (e.g. "Limpiar todo")
		}
	}, [filters.search]);
	useEffect(() => {
		if (searchText === lastEmitted.current) return;
		const timer = setTimeout(() => {
			lastEmitted.current = searchText;
			onChange({ ...filtersRef.current, search: searchText });
		}, SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchText]);

	const multi = (dim: MultiSelectDimension, opts: FilterOption[] = options[dim]) => (
		<MultiSelect
			id={`works-filter-${dim}`}
			label={DIMENSION_LABELS[dim]}
			options={opts}
			selected={filters[DIMENSION_FIELD[dim]]}
			onChange={(next) => patch({ [DIMENSION_FIELD[dim]]: next })}
		/>
	);

	return (
		<div className="space-y-3">
			<div className="flex gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Buscar por dirección, nombre o apellido del cliente..."
						aria-label="Buscar obras"
						className="w-full pl-10"
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
					/>
				</div>

				<Sheet open={open} onOpenChange={setOpen}>
					<SheetTrigger asChild>
						<Button type="button" variant="outline" className="shrink-0">
							<SlidersHorizontal className="h-4 w-4 sm:mr-2" />
							<span className="hidden sm:inline">Filtros</span>
							{chips.length > 0 && (
								<Badge variant="secondary" className="ml-2">
									{chips.length}
								</Badge>
							)}
							<span className="sr-only sm:hidden">Filtros</span>
						</Button>
					</SheetTrigger>
					<SheetContent className="w-full sm:max-w-md">
						<SheetHeader>
							<SheetTitle>Filtros de obras</SheetTitle>
							<SheetDescription>
								Valen para la lista y para las métricas. Los cambios se aplican al instante.
							</SheetDescription>
						</SheetHeader>

						<div className="flex-1 space-y-6 overflow-y-auto px-4 pb-2">
							<Section title="Ubicación">
								{multi('locality')}
								{multi('hood')}
								{multi('zone')}
							</Section>

							<Section title="Personas">
								{multi('architect')}
								{multi('client')}
							</Section>

							<Section title="Obra">
								{multi('status', statusOptions(options))}
								<div className="space-y-1.5">
									<label htmlFor="works-filter-budget" className="text-sm font-medium">
										Presupuesto
									</label>
									<Select
										value={filters.hasBudget}
										onValueChange={(v) => patch({ hasBudget: v as BudgetFilter })}
									>
										<SelectTrigger id="works-filter-budget" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Con y sin presupuesto</SelectItem>
											<SelectItem value="with">Solo con presupuesto</SelectItem>
											<SelectItem value="without">Solo sin presupuesto</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium">Avance</span>
										<span className="tabular-nums text-muted-foreground">
											{filters.progress[0]}% a {filters.progress[1]}%
										</span>
									</div>
									<Slider
										min={0}
										max={100}
										step={5}
										value={filters.progress}
										onValueChange={(v) => patch({ progress: [v[0], v[1]] })}
										aria-label="Rango de avance"
									/>
								</div>
							</Section>

							<Section title="Fechas">
								<DateRangeField
									legend="Creación"
									value={filters.createdAt}
									onChange={(createdAt) => patch({ createdAt })}
									period={filters.createdPeriod}
									years={options.years.createdAt}
									onPeriodChange={(createdPeriod) => patch({ createdPeriod })}
								/>
								<DateRangeField
									legend="Finalización"
									value={filters.completionDate}
									onChange={(completionDate) => patch({ completionDate })}
									period={filters.completionPeriod}
									years={options.years.completionDate}
									onPeriodChange={(completionPeriod) => patch({ completionPeriod })}
								/>
								<p className="text-xs text-muted-foreground">
									El período y el rango de fechas se combinan: la obra tiene que cumplir los dos.
									Filtrar por una fecha deja afuera las obras que no la tienen (por ejemplo, las que
									todavía no tienen fecha de finalización).
								</p>
							</Section>
						</div>

						<SheetFooter className="flex-row gap-2 border-t">
							<Button
								type="button"
								variant="outline"
								className="flex-1"
								disabled={chips.length === 0}
								onClick={() => onChange(defaultFilters)}
							>
								Limpiar todo
							</Button>
							<Button type="button" className="flex-1" onClick={() => setOpen(false)}>
								Ver {resultCount} de {totalCount} obras
							</Button>
						</SheetFooter>
					</SheetContent>
				</Sheet>
				{actions}
			</div>

			{chips.length > 0 && (
				<div
					role="group"
					className="flex flex-wrap items-center gap-2"
					aria-label="Filtros activos"
				>
					{chips.map((chip) => (
						<Badge key={chip.id} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 font-normal">
							<span className="text-muted-foreground">{chip.group}:</span>
							<span className="max-w-[16rem] truncate">{chip.label}</span>
							<button
								type="button"
								onClick={() => onChange(chip.remove(filters))}
								aria-label={`Quitar filtro ${chip.group}: ${chip.label}`}
								className="rounded-full p-0.5 hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-muted-foreground"
						onClick={() => onChange(defaultFilters)}
					>
						Limpiar todo
					</Button>
				</div>
			)}
		</div>
	);
}
