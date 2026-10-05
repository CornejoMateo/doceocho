'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Filter, Download } from 'lucide-react';
import { formatCurrency } from '@/utils/formats-money';
import { BALANCES_REPORT_COLUMNS } from '@/constants/balances/balances-report';
import { hasActiveFilters } from '@/helpers/balances/filter-balances';
import {
	generateBalancesPDF,
	getFiltersDescription,
} from '@/helpers/balances/generate-balance-pdf';
import type { BalancesReportState } from '@/hooks/balances/use-balances-report';
import type { BalanceReportRow } from '@/components/business/cash-flow/balances-tab/types';
import { BalanceFilterDialog } from './balance-filter-dialog';
import { BalanceMobileCard } from './balance-mobile-card';

export type BalancesTabProps = Pick<
	BalancesReportState,
	| 'loading'
	| 'initialLoading'
	| 'refresh'
	| 'filteredRows'
	| 'searchTerm'
	| 'setSearchTerm'
	| 'sortField'
	| 'sortDirection'
	| 'handleSort'
	| 'filters'
	| 'updateFilters'
	| 'resetFilters'
	| 'filterDialogOpen'
	| 'setFilterDialogOpen'
>;

export function BalancesTab({
	loading,
	initialLoading,
	refresh,
	filteredRows,
	searchTerm,
	setSearchTerm,
	sortField,
	sortDirection,
	handleSort,
	filters,
	updateFilters,
	resetFilters,
	filterDialogOpen,
	setFilterDialogOpen,
}: BalancesTabProps) {
	const getSortIcon = (field: keyof BalanceReportRow) => {
		if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
		return sortDirection === 'asc' ? (
			<ArrowUp className="h-4 w-4" />
		) : (
			<ArrowDown className="h-4 w-4" />
		);
	};

	const handleDownloadPDF = () => {
		const filtersDesc = getFiltersDescription(filters);
		generateBalancesPDF(filteredRows, filtersDesc);
	};

	return (
		<div className="space-y-4">
			{/* Controls */}
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
					<Button
						variant={hasActiveFilters(filters) ? 'default' : 'outline'}
						onClick={() => setFilterDialogOpen(true)}
						className="gap-2"
					>
						<Filter className="h-4 w-4" />
						Filtros
					</Button>

					<Input
						placeholder="Buscar por cliente, obra, concepto..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full sm:w-[300px]"
					/>
				</div>
			</div>

			<Card className="p-0 bg-card border-border">
				<div className="p-4 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="text-sm text-muted-foreground">
						{initialLoading ? 'Cargando...' : `${filteredRows.length} fila(s)`}
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
							<Download className="h-4 w-4" />
							Descargar PDF
						</Button>
						<Button
							variant="outline"
							onClick={() => refresh()}
							disabled={loading}
							className="gap-2"
						>
							<RefreshCw className={`h-4 w-4${loading ? ' animate-spin' : ''}`} />
							Actualizar
						</Button>
					</div>
				</div>

				{/* Mobile Card View */}
				<div className="p-4 md:hidden space-y-3">
					{initialLoading ? (
						<p className="text-center text-muted-foreground py-6">Cargando cuentas corrientes...</p>
					) : filteredRows.length === 0 ? (
						<p className="text-center text-muted-foreground py-6">No hay resultados</p>
					) : (
						filteredRows.map((r) => <BalanceMobileCard key={r.id} row={r} />)
					)}
				</div>

				{/* Desktop Table View */}
				<div className="hidden md:block overflow-x-auto">
					<div className="min-w-[1000px]">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('contractDate')}
									>
										<div className="flex w-full items-center justify-center gap-1">
											{BALANCES_REPORT_COLUMNS.contractDate}
											{getSortIcon('contractDate')}
										</div>
									</TableHead>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50 text-center"
										onClick={() => handleSort('client')}
									>
										<div className="flex w-full items-center justify-center gap-1">
											{BALANCES_REPORT_COLUMNS.client}
											{getSortIcon('client')}
										</div>
									</TableHead>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('work')}
									>
										<div className="flex w-full items-center justify-center gap-1">
											{BALANCES_REPORT_COLUMNS.work}
											{getSortIcon('work')}
										</div>
									</TableHead>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50 text-center"
										onClick={() => handleSort('concept')}
									>
										<div className="flex w-full items-center justify-center gap-1">
											{BALANCES_REPORT_COLUMNS.concept}
											{getSortIcon('concept')}
										</div>
									</TableHead>
									<TableHead
										className="text-center whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('purchaseArs')}
									>
										<div className="flex items-center justify-center gap-1">
											{BALANCES_REPORT_COLUMNS.purchase}
											{getSortIcon('purchaseArs')}
										</div>
									</TableHead>
									<TableHead
										className="text-center whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('deliveriesArs')}
									>
										<div className="flex items-center justify-center gap-1">
											{BALANCES_REPORT_COLUMNS.deliveries}
											{getSortIcon('deliveriesArs')}
										</div>
									</TableHead>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('balanceType')}
									>
										<div className="flex items-center gap-1">
											{BALANCES_REPORT_COLUMNS.balanceType}
											{getSortIcon('balanceType')}
										</div>
									</TableHead>
									<TableHead
										className="text-center whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('balanceAmountArs')}
									>
										<div className="flex items-center justify-center gap-1">
											{BALANCES_REPORT_COLUMNS.balanceAmount}
											{getSortIcon('balanceAmountArs')}
										</div>
									</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{initialLoading ? (
									<TableRow>
										<TableCell colSpan={8} className="text-center text-muted-foreground">
											Cargando cuentas corrientes...
										</TableCell>
									</TableRow>
								) : filteredRows.length === 0 ? (
									<TableRow>
										<TableCell colSpan={8} className="text-center text-muted-foreground">
											No hay resultados
										</TableCell>
									</TableRow>
								) : (
									filteredRows.map((r) => (
										<TableRow key={r.id}>
											<TableCell className="whitespace-nowrap text-center">
												{r.contractDate}
											</TableCell>
											<TableCell className="font-medium whitespace-nowrap text-center">
												{r.client}
											</TableCell>
											<TableCell className="whitespace-nowrap text-center">{r.work}</TableCell>
											<TableCell className="whitespace-nowrap text-center">{r.concept}</TableCell>
											<TableCell className="text-center whitespace-nowrap">
												{formatCurrency(r.purchaseArs)}
											</TableCell>
											<TableCell className="text-center whitespace-nowrap">
												{formatCurrency(r.deliveriesArs)}
											</TableCell>
											<TableCell className="whitespace-nowrap text-center">
												{r.balanceType}
											</TableCell>
											<TableCell className="text-center whitespace-nowrap">
												{formatCurrency(r.balanceAmountArs)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</div>
			</Card>

			<BalanceFilterDialog
				open={filterDialogOpen}
				onOpenChange={setFilterDialogOpen}
				filters={filters}
				onFiltersChange={updateFilters}
				onReset={resetFilters}
			/>
		</div>
	);
}
