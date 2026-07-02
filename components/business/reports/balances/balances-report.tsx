'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { formatCurrency, formatCurrencyUSD } from '@/utils/formats-money';
import { formatShortDate } from '@/utils/format-date';
import { calculateBalanceStats } from '@/helpers/balances/stats';
import {
	BALANCES_REPORT_COLUMNS,
	BALANCE_TYPES,
	DEFAULT_FALLBACK,
} from '@/constants/balances/balances-report';
import { StatsCardsBalances } from '@/components/business/balances/stats-cards-balances';
import { BalanceWithBudgetAndClient, listBalancesForReport } from '@/lib/balances/balances';
import { getLastTransactionUSD } from '@/lib/balances/balance_transactions';
import { getTotalsByBalanceIds } from '@/lib/balances/balance_transactions';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { normalizeMoney } from '@/utils/formats-money';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BudgetsReport } from '@/components/business/reports/budgets/budgets-report';

type BalanceReportRow = {
	id: number;
	contractDate: string;
	contractDateRaw: Date;
	client: string;
	work: string;
	concept: string;
	purchaseArs: number;
	deliveriesArs: number;
	balanceType: string;
	balanceAmountArs: number;
	usdContractRef: number;
	usdCurrentToCancel: number | null;
	balanceInUseUsd: number;
};

export function BalancesReport() {
	const [searchTerm, setSearchTerm] = useState('');
	const [rows, setRows] = useState<BalanceReportRow[]>([]);
	const [sortField, setSortField] = useState<keyof BalanceReportRow>('contractDate');
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
	const [balanceTypeFilter, setBalanceTypeFilter] = useState<string>('all');

	// Calculate stats
	const balanceStats = useMemo(() => {
		return calculateBalanceStats(rows);
	}, [rows]);

	const {
		data: balances,
		loading,
		refresh,
	} = useOptimizedRealtime<BalanceWithBudgetAndClient>(
		'balances',
		async () => {
			const { data } = await listBalancesForReport();
			return data ?? [];
		},
		'balances_report_cache'
	);

	useEffect(() => {
		const build = async () => {
			if (!balances?.length) {
				setRows([]);
				return;
			}

			const ids = balances.map((b) => b.id);
			const { data: totals } = await getTotalsByBalanceIds(ids);

			const next: BalanceReportRow[] = await Promise.all(
				balances.map(async (b) => {
					const totalPaid = totals?.[b.id]?.totalAmount ?? 0;
					const totalPaidUSD = totals?.[b.id]?.totalAmountUSD ?? 0;
					const budgetUsd = b.balance_amount_usd ?? 0;
					const budgetArs = b.balance_amount_ars ?? 0;
					const remainingUsd = normalizeMoney(budgetUsd - totalPaidUSD);
					const remainingArs = normalizeMoney(budgetArs - totalPaid);

					const clientName =
						`${b.client?.last_name ?? ''} ${b.client?.name ?? ''}`.trim() || DEFAULT_FALLBACK;
					const workLocality = b.budget?.folder_budget?.work?.locality ?? '';
					const workAddress = b.budget?.folder_budget?.work?.address ?? '';
					const work =
						`${workLocality}${workLocality && workAddress ? ' - ' : ''}${workAddress}`.trim() ||
						DEFAULT_FALLBACK;

					const conceptParts = [b.budget?.number ?? '', b.budget?.type ?? ''].filter(Boolean);
					const concept = conceptParts.join(' - ') || DEFAULT_FALLBACK;

					const usdContractRef = Number(b.contract_date_usd) || 0;

					const balanceType =
						remainingUsd > 0
							? BALANCE_TYPES.DEBTOR
							: remainingUsd < 0
								? BALANCE_TYPES.CREDITOR
								: BALANCE_TYPES.CANCELLED;
					const balanceAmountArs = remainingArs;
					const balanceInUseUsd = remainingUsd;

					const contractDateRaw = new Date(b.start_date || b.created_at);
					let usdCurrentToCancel: number | null = null;
					if (balanceType === BALANCE_TYPES.CANCELLED) {
						const { data: lastTransactionUsd } = await getLastTransactionUSD(String(b.id));
						usdCurrentToCancel = lastTransactionUsd ?? 0;
					}

					return {
						id: b.id,
						contractDate: formatShortDate(b.start_date || b.created_at),
						contractDateRaw,
						client: clientName,
						work,
						concept,
						purchaseArs: budgetArs,
						deliveriesArs: totalPaid,
						balanceType,
						balanceAmountArs,
						usdContractRef,
						usdCurrentToCancel: usdCurrentToCancel,
						balanceInUseUsd,
					};
				})
			);

			setRows(next);
		};

		build();
	}, [balances]);

	const filteredRows = useMemo(() => {
		let filtered = rows;

		// Filter to type
		if (balanceTypeFilter !== 'all') {
			filtered = filtered.filter((r) => r.balanceType === balanceTypeFilter);
		}

		// Filter to text
		const s = searchTerm.trim().toLowerCase();
		if (s) {
			filtered = filtered.filter((r) => {
				return (
					r.client.toLowerCase().includes(s) ||
					r.work.toLowerCase().includes(s) ||
					r.concept.toLowerCase().includes(s) ||
					r.balanceType.toLowerCase().includes(s)
				);
			});
		}

		// Order
		return filtered.sort((a, b) => {
			let aVal = a[sortField];
			let bVal = b[sortField];

			// for date, use camp raw Date
			if (sortField === 'contractDate') {
				aVal = a.contractDateRaw;
				bVal = b.contractDateRaw;
			}

			// Management of strings vs numbers
			if (typeof aVal === 'string' && typeof bVal === 'string') {
				aVal = aVal.toLowerCase();
				bVal = bVal.toLowerCase();
			}

			if (aVal == null) aVal = '';
			if (bVal == null) bVal = '';
			if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});
	}, [rows, searchTerm, sortField, sortDirection, balanceTypeFilter]);

	const handleSort = (field: keyof BalanceReportRow) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDirection('asc');
		}
	};

	const getSortIcon = (field: keyof BalanceReportRow) => {
		if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
		return sortDirection === 'asc' ? (
			<ArrowUp className="h-4 w-4" />
		) : (
			<ArrowDown className="h-4 w-4" />
		);
	};

	return (
		<div className="space-y-6">
			{/* Stats Cards */}
			<StatsCardsBalances stats={balanceStats} />

			{/* Tabs */}
			<Tabs defaultValue="budgets" className="space-y-4">
				<TabsList className="bg-card border border-border">
					<TabsTrigger value="balances" disabled>
						Saldos
					</TabsTrigger>
					<TabsTrigger value="budgets">Presupuestos</TabsTrigger>
					<TabsTrigger value="other">A definir</TabsTrigger>
				</TabsList>

				<TabsContent value="balances" className="space-y-4">
					{/* Controls */}
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<Select value={balanceTypeFilter} onValueChange={setBalanceTypeFilter}>
							<SelectTrigger className="w-full sm:w-[180px]">
								<SelectValue placeholder="Tipo de saldo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todos los tipos</SelectItem>
								<SelectItem value={BALANCE_TYPES.DEBTOR}>Deudor</SelectItem>
								<SelectItem value={BALANCE_TYPES.CREDITOR}>Acreedor</SelectItem>
								<SelectItem value={BALANCE_TYPES.CANCELLED}>Cancelado</SelectItem>
							</SelectContent>
						</Select>

						<Input
							placeholder="Buscar por cliente, obra, concepto..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full sm:w-[300px]"
						/>
					</div>

					<Card className="p-0 bg-card border-border overflow-x-auto">
						<div className="p-4 border-b flex items-center justify-between min-w-[800px]">
							<div className="text-sm text-muted-foreground">
								{loading ? 'Cargando...' : `${filteredRows.length} fila(s)`}
							</div>
							<Button variant="outline" onClick={() => refresh()} className="gap-2">
								<RefreshCw className="h-4 w-4" />
								Actualizar
							</Button>
						</div>

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('contractDate')}
									>
										<div className="flex items-center gap-1">
											{BALANCES_REPORT_COLUMNS.contractDate}
											{getSortIcon('contractDate')}
										</div>
									</TableHead>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('client')}
									>
										<div className="flex items-center gap-1">
											{BALANCES_REPORT_COLUMNS.client}
											{getSortIcon('client')}
										</div>
									</TableHead>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('work')}
									>
										<div className="flex items-center gap-1">
											{BALANCES_REPORT_COLUMNS.work}
											{getSortIcon('work')}
										</div>
									</TableHead>
									<TableHead
										className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('concept')}
									>
										<div className="flex items-center gap-1">
											{BALANCES_REPORT_COLUMNS.concept}
											{getSortIcon('concept')}
										</div>
									</TableHead>
									<TableHead
										className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('purchaseArs')}
									>
										<div className="flex items-center justify-end gap-1">
											{BALANCES_REPORT_COLUMNS.purchase}
											{getSortIcon('purchaseArs')}
										</div>
									</TableHead>
									<TableHead
										className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('deliveriesArs')}
									>
										<div className="flex items-center justify-end gap-1">
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
										className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('balanceAmountArs')}
									>
										<div className="flex items-center justify-end gap-1">
											{BALANCES_REPORT_COLUMNS.balanceAmount}
											{getSortIcon('balanceAmountArs')}
										</div>
									</TableHead>
									<TableHead
										className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('usdContractRef')}
									>
										<div className="flex items-center justify-end gap-1">
											{BALANCES_REPORT_COLUMNS.usdContractRef}
											{getSortIcon('usdContractRef')}
										</div>
									</TableHead>
									<TableHead
										className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('usdCurrentToCancel')}
									>
										<div className="flex items-center justify-end gap-1">
											{BALANCES_REPORT_COLUMNS.usdCurrentToCancel}
											{getSortIcon('usdCurrentToCancel')}
										</div>
									</TableHead>
									<TableHead
										className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
										onClick={() => handleSort('balanceInUseUsd')}
									>
										<div className="flex items-center justify-end gap-1">
											{BALANCES_REPORT_COLUMNS.balanceInUseUsd}
											{getSortIcon('balanceInUseUsd')}
										</div>
									</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={11} className="text-center text-muted-foreground">
											Cargando saldos...
										</TableCell>
									</TableRow>
								) : filteredRows.length === 0 ? (
									<TableRow>
										<TableCell colSpan={11} className="text-center text-muted-foreground">
											No hay resultados
										</TableCell>
									</TableRow>
								) : (
									filteredRows.map((r) => (
										<TableRow key={r.id}>
											<TableCell className="whitespace-nowrap">{r.contractDate}</TableCell>
											<TableCell className="font-medium whitespace-nowrap">{r.client}</TableCell>
											<TableCell className="whitespace-nowrap">{r.work}</TableCell>
											<TableCell className="whitespace-nowrap">{r.concept}</TableCell>
											<TableCell className="text-right whitespace-nowrap">
												{formatCurrency(r.purchaseArs)}
											</TableCell>
											<TableCell className="text-right whitespace-nowrap">
												{formatCurrency(r.deliveriesArs)}
											</TableCell>
											<TableCell className="whitespace-nowrap">{r.balanceType}</TableCell>
											<TableCell className="text-right whitespace-nowrap">
												{formatCurrency(r.balanceAmountArs)}
											</TableCell>
											<TableCell className="text-right whitespace-nowrap">
												{formatCurrencyUSD(r.usdContractRef)}
											</TableCell>
											<TableCell className="text-right whitespace-nowrap">
												{formatCurrencyUSD(r.usdCurrentToCancel)}
											</TableCell>
											<TableCell className="text-right whitespace-nowrap">
												{formatCurrencyUSD(r.balanceInUseUsd)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</Card>
				</TabsContent>

				<TabsContent value="budgets" className="space-y-4">
					<BudgetsReport />
				</TabsContent>

				<TabsContent value="other" className="space-y-4">
					<div className="border rounded-lg p-8 text-center">
						<p className="text-muted-foreground">
							Contenido de esta sección será implementado aquí
						</p>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
