'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import { Plus, Search } from 'lucide-react';
import { BalanceWithBudget } from '@/lib/balances/balances';
import { getTotalByBalanceId } from '@/lib/balances/balance_transactions';
import { BalanceDetailsModal } from './balance-details-modal';
import { DollarUpdateModal } from '@/components/ui/dollar-update-modal';
import { calculateBalanceSummary } from '@/helpers/balances/balance-calculations';
import { BalanceCard } from './balance-card';
import { useBalanceHandlers } from '@/hooks/balances/use-balance-handlers';

interface ClientBalancesProps {
	clientId: number;
	balances: BalanceWithBudget[];
	isLoading?: boolean;
	onRefresh: () => void;
	onCreateBalance?: () => void;
	onBalanceDeleted?: () => void;
}

export interface BalanceWithTotals extends BalanceWithBudget {
	totalPaid?: number;
	remaining?: number;
	totalPaidUSD?: number;
	remainingUSD?: number;
}

export function ClientBalances({
	clientId,
	balances,
	isLoading = false,
	onRefresh,
	onCreateBalance,
	onBalanceDeleted,
}: ClientBalancesProps) {
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [balancesWithTotals, setBalancesWithTotals] = useState<BalanceWithTotals[]>([]);
	const itemsPerPage = 2;

	const {
		selectedBalance,
		isDetailsModalOpen,
		setIsDetailsModalOpen,
		balanceToDelete,
		isDeleteDialogOpen,
		setIsDeleteDialogOpen,
		isDollarUpdateModalOpen,
		setIsDollarUpdateModalOpen,
		balanceToUpdate,
		openDetailsModal,
		openDeleteDialog,
		openDollarUpdateModal,
		handleDeleteBalance,
		handleDollarUpdate,
		handleBalanceUpdate,
	} = useBalanceHandlers({
		onBalanceDeleted,
		onRefresh,
	});

	// Calculate totals whenever balances change
	useEffect(() => {
		const fetchTotals = async () => {
			if (!balances || balances.length === 0) {
				setBalancesWithTotals([]);
				return;
			}

			const balancesWithTotals = await Promise.all(
				balances.map(async (balance) => {
					const { data: totals } = await getTotalByBalanceId(balance.id);
					const totalPaid = totals?.totalAmount || 0;
					const totalPaidUSD = totals?.totalAmountUSD || 0;
					const totalExtraArs = totals?.totalExtraAmount || 0;
					const totalExtraUsd = totals?.totalExtraAmountUSD || 0;
					const summary = calculateBalanceSummary({
						budgetAmountArs: balance.balance_amount_ars,
						budgetAmountUsd: balance.balance_amount_usd,
						usdCurrent: balance.usd_current,
						totalPaidArs: totalPaid,
						totalPaidUsd: totalPaidUSD,
						totalExtraArs,
						totalExtraUsd,
					});

					return {
						...balance,
						totalPaid,
						totalPaidUSD,
						totalExtraArs,
						totalExtraUsd,
						remaining: summary.remainingArs,
						remainingUSD: summary.remainingUsd,
					};
				})
			);
			setBalancesWithTotals(balancesWithTotals);
		};

		fetchTotals();
	}, [balances]);

	// Filter balances based on search term
	const filteredBalances = useMemo(() => {
		return balancesWithTotals.filter((balance) => {
			const searchLower = searchTerm.toLowerCase();
			const work = balance.budget?.folder_budget?.work;
			return (
				work?.locality?.toLowerCase().includes(searchLower) ||
				work?.address?.toLowerCase().includes(searchLower) ||
				(balance.budget?.amount_ars?.toString() || '').includes(searchLower)
			);
		});
	}, [balancesWithTotals, searchTerm]);

	// Calculate pagination
	const totalPages = Math.ceil(filteredBalances.length / itemsPerPage);

	// Get current items
	const currentItems = useMemo(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		return filteredBalances.slice(startIndex, startIndex + itemsPerPage);
	}, [filteredBalances, currentPage, itemsPerPage]);

	// Reset to first page when balances change
	useEffect(() => {
		setCurrentPage(1);
	}, [filteredBalances.length]);

	return (
		<div className="space-y-4 max-w-3xl mx-auto w-full">
			{/* Search Bar */}
			<div className="flex flex-col sm:flex-row gap-4 mb-6">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Buscar por localidad, dirección o presupuesto..."
						className="pl-9 w-full"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
					/>
				</div>
				{onCreateBalance && (
					<Button
						onClick={onCreateBalance}
						size="default"
						className="w-full sm:w-auto whitespace-nowrap"
					>
						<Plus className="h-4 w-4 mr-2" />
						Crear Saldo
					</Button>
				)}
			</div>

			{isLoading ? (
				<p className="text-sm text-muted-foreground text-center py-4">Cargando saldos...</p>
			) : filteredBalances.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-4">
					{searchTerm
						? 'No se encontraron saldos que coincidan con la búsqueda.'
						: 'No hay saldos registrados para este cliente.'}
				</p>
			) : (
				<div className="space-y-3">
					{currentItems.map((balance) => {
						const summary = calculateBalanceSummary({
							budgetAmountArs: balance.balance_amount_ars,
							budgetAmountUsd: balance.balance_amount_usd,
							usdCurrent: balance.usd_current,
							totalPaidArs: balance.totalPaid,
							totalPaidUsd: balance.totalPaidUSD,
							totalExtraArs: (balance as any).totalExtraArs,
							totalExtraUsd: (balance as any).totalExtraUsd,
						});

						return (
							<BalanceCard
								key={balance.id}
								balance={balance}
								summary={summary}
								onCardClick={() => openDetailsModal(balance)}
								onDollarUpdate={() => openDollarUpdateModal(balance)}
								onDeleteClick={() => openDeleteDialog(balance)}
							/>
						);
					})}
				</div>
			)}

			{filteredBalances.length > itemsPerPage && (
				<div className="flex items-center justify-between px-2 mt-6">
					<div className="text-sm text-muted-foreground">
						Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBalances.length)}-
						{Math.min(currentPage * itemsPerPage, filteredBalances.length)} de{' '}
						{filteredBalances.length} saldos
					</div>

					<Pagination className="mx-0 w-auto">
						<PaginationContent>
							<PaginationItem>
								<PaginationPrevious
									onClick={(e) => {
										e.preventDefault();
										setCurrentPage((p) => Math.max(1, p - 1));
									}}
									className={
										currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
									}
								/>
							</PaginationItem>

							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								let pageNum = i + 1;
								if (totalPages > 5) {
									if (currentPage <= 3) {
										pageNum = i + 1;
									} else if (currentPage >= totalPages - 2) {
										pageNum = totalPages - 4 + i;
									} else {
										pageNum = currentPage - 2 + i;
									}
								}
								return (
									<PaginationItem key={pageNum}>
										<PaginationLink
											isActive={currentPage === pageNum}
											className="cursor-pointer"
											onClick={(e) => {
												e.preventDefault();
												setCurrentPage(pageNum);
											}}
										>
											{pageNum}
										</PaginationLink>
									</PaginationItem>
								);
							})}

							<PaginationItem>
								<PaginationNext
									onClick={(e) => {
										e.preventDefault();
										setCurrentPage((p) => Math.min(totalPages, p + 1));
									}}
									className={
										currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
									}
								/>
							</PaginationItem>
						</PaginationContent>
					</Pagination>
				</div>
			)}

			<BalanceDetailsModal
				key={selectedBalance?.id ?? 0}
				balance={selectedBalance}
				isOpen={isDetailsModalOpen}
				onOpenChange={setIsDetailsModalOpen}
				onTransactionCreated={handleBalanceUpdate}
			/>

			<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Eliminar saldo?</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. Se eliminará permanentemente el saldo
							{balanceToDelete?.budget?.folder_budget?.work &&
								` de la obra en ${balanceToDelete.budget.folder_budget.work.locality}`}{' '}
							y todas sus transacciones asociadas.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteBalance}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Eliminar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<DollarUpdateModal
				isOpen={isDollarUpdateModalOpen}
				onOpenChange={setIsDollarUpdateModalOpen}
				balance={balanceToUpdate}
				onUpdateConfirmed={handleDollarUpdate}
			/>
		</div>
	);
}
