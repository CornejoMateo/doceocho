import { EditOnly } from '@/components/permissions/edit-scope';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit, Trash2, Wallet } from 'lucide-react';
import { IncomeExpenseEntry } from '@/hooks/income-expense/use-income-expense-tab';
import { usePaginatedRows } from '@/hooks/use-paginated-rows';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { formatCurrency } from '@/utils/formats-money';
import { formatDateOnly } from '@/utils/format-date';

const PAGE_SIZE = 20;

type IncomeExpenseListProps = {
	entries: IncomeExpenseEntry[];
	loading: boolean;
	partyLabel: string;
	emptyLabel: string;
	onEdit: (entry: IncomeExpenseEntry) => void;
	onAskDelete: (entry: IncomeExpenseEntry) => void;
	onAddPayment?: (entry: IncomeExpenseEntry) => void;
	pageResetKey?: string;
	onRowClick?: (entry: IncomeExpenseEntry) => void;
};

const ROW_HINT = 'Ver detalle y archivos';

export function IncomeExpenseList({
	entries,
	loading,
	partyLabel,
	emptyLabel,
	onEdit,
	onAskDelete,
	onAddPayment,
	pageResetKey = '',
	onRowClick,
}: IncomeExpenseListProps) {
	const { paginatedData, currentPage, totalPages, totalItems, setPage } = usePaginatedRows(
		entries,
		PAGE_SIZE,
		pageResetKey
	);

	// A text-selection drag that ends inside the row shouldn't open the detail dialog.
	const hasActiveSelection = () => {
		const selection = typeof window !== 'undefined' ? window.getSelection() : null;
		return !!selection && selection.toString().length > 0;
	};

	const handleRowClick = (entry: IncomeExpenseEntry) => {
		if (!onRowClick || hasActiveSelection()) return;
		onRowClick(entry);
	};

	const handleRowKeyDown = (entry: IncomeExpenseEntry) => (e: React.KeyboardEvent) => {
		if (!onRowClick) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onRowClick(entry);
		}
	};

	// Keeps clicks/keyboard activation on the action buttons from bubbling up to the row.
	const stopActionsBubbling = {
		onClick: (e: React.MouseEvent) => e.stopPropagation(),
		onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation(),
	};

	const rowActivationProps = (entry: IncomeExpenseEntry) =>
		onRowClick
			? {
					tabIndex: 0,
					'aria-label': ROW_HINT,
					title: ROW_HINT,
					onClick: () => handleRowClick(entry),
					onKeyDown: handleRowKeyDown(entry),
				}
			: {};

	const renderActions = (entry: IncomeExpenseEntry, withLabel: boolean) => {
		const size = withLabel ? 'default' : 'sm';
		const buttonClass = withLabel ? 'flex-1 gap-2' : '';
		const addPaymentButton = onAddPayment ? (
			<Button
				variant={withLabel ? 'outline' : 'ghost'}
				size={size}
				aria-label="Agregar pago"
				title="Agregar pago"
				className={buttonClass}
				onClick={() => onAddPayment(entry)}
			>
				<Wallet className="h-4 w-4" />
				{withLabel && 'Agregar pago'}
			</Button>
		) : null;
		return (
			<>
				<EditOnly edit="cash-flow">{addPaymentButton}</EditOnly>
				<EditOnly edit="cash-flow">
					<Button
						variant={withLabel ? 'outline' : 'ghost'}
						size={size}
						aria-label="Editar"
						title="Editar"
						className={buttonClass}
						onClick={() => onEdit(entry)}
					>
						<Edit className="h-4 w-4" />
						{withLabel && 'Editar'}
					</Button>
				</EditOnly>
				<EditOnly edit="cash-flow">
					<Button
						variant={withLabel ? 'outline' : 'ghost'}
						size={size}
						aria-label="Eliminar"
						title="Eliminar"
						className={`text-destructive ${buttonClass}`}
						onClick={() => onAskDelete(entry)}
					>
						<Trash2 className="h-4 w-4" />
						{withLabel && 'Eliminar'}
					</Button>
				</EditOnly>
			</>
		);
	};

	return (
		<div className="space-y-4 min-w-0">
			{loading ? (
				<Card className="bg-card border-border p-8 text-center text-muted-foreground">
					Cargando...
				</Card>
			) : entries.length === 0 ? (
				<Card className="bg-card border-border p-8 text-center text-muted-foreground">
					{emptyLabel}
				</Card>
			) : (
				<>
					<div className="hidden md:block" data-testid="income-expense-desktop">
						<Card className="bg-card border-border overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-center">Fecha</TableHead>
										<TableHead className="text-center">Comprobante</TableHead>
										<TableHead className="text-center">{partyLabel}</TableHead>
										<TableHead className="text-center">Obra</TableHead>
										<TableHead className="text-center">Categoría</TableHead>
										<TableHead className="text-center">Detalle</TableHead>
										<TableHead className="text-center">Neto</TableHead>
										<TableHead className="text-center">IVA</TableHead>
										<TableHead className="text-center">Total</TableHead>
										<TableHead className="text-center">Medio de pago</TableHead>
										<TableHead className="text-center">Acciones</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginatedData.map((entry) => (
										<TableRow
											key={entry.id}
											className={onRowClick ? 'cursor-pointer' : undefined}
											{...rowActivationProps(entry)}
										>
											<TableCell className="text-center whitespace-nowrap">
												{entry.date.split('-').reverse().join('/')}
											</TableCell>
											<TableCell className="text-center">
												<div className="flex flex-col">
													<span>{entry.voucher_type_name}</span>
													{entry.voucher_number && (
														<span className="text-xs text-muted-foreground">
															{entry.voucher_number}
														</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-center">{entry.party_name}</TableCell>
											<TableCell className="text-center">{entry.work_name || '-'}</TableCell>
											<TableCell className="text-center">{entry.category_name}</TableCell>
											<TableCell className="text-center max-w-[200px] truncate">
												{entry.description || '-'}
											</TableCell>
											<TableCell className="text-center">
												{formatCurrency(entry.net_amount)}
											</TableCell>
											<TableCell className="text-center">
												{formatCurrency(entry.iva_amount)}
											</TableCell>
											<TableCell className="text-center font-medium">
												{formatCurrency(entry.total_amount)}
											</TableCell>
											<TableCell className="text-center">
												<div className="flex flex-col">
													<span>{entry.payment_method_name || '-'}</span>
													{entry.bank_account_name && (
														<span className="text-xs text-muted-foreground">
															{entry.bank_account_name}
														</span>
													)}
												</div>
											</TableCell>
											<TableCell className="text-center">
												<div className="flex justify-center gap-2" {...stopActionsBubbling}>
													{renderActions(entry, false)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					</div>

					<div className="md:hidden space-y-3" data-testid="income-expense-mobile">
						{paginatedData.map((entry) => (
							<Card
								key={entry.id}
								className={`bg-card border-border p-4 space-y-3 ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
								{...rowActivationProps(entry)}
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium">{formatDateOnly(entry.date)}</span>
									<span className="font-semibold">{formatCurrency(entry.total_amount)}</span>
								</div>
								<dl className="space-y-1 text-sm">
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">{partyLabel}</dt>
										<dd className="text-right">{entry.party_name}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Comprobante</dt>
										<dd className="text-right">
											{entry.voucher_type_name}
											{entry.voucher_number ? ` · ${entry.voucher_number}` : ''}
										</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Obra</dt>
										<dd className="text-right">{entry.work_name || '-'}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Categoría</dt>
										<dd className="text-right">{entry.category_name}</dd>
									</div>
									{entry.description && (
										<div className="flex justify-between gap-2">
											<dt className="text-muted-foreground">Detalle</dt>
											<dd className="text-right break-words">{entry.description}</dd>
										</div>
									)}
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Neto</dt>
										<dd>{formatCurrency(entry.net_amount)}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">IVA ({entry.iva_percent}%)</dt>
										<dd>{formatCurrency(entry.iva_amount)}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Medio de pago</dt>
										<dd className="text-right">
											{entry.payment_method_name || '-'}
											{entry.bank_account_name ? ` · ${entry.bank_account_name}` : ''}
										</dd>
									</div>
								</dl>
								<div className="flex gap-2 pt-1" {...stopActionsBubbling}>
									{renderActions(entry, true)}
								</div>
							</Card>
						))}
					</div>

					<PaginationControls
						currentPage={currentPage}
						totalPages={totalPages}
						totalItems={totalItems}
						itemsPerPage={PAGE_SIZE}
						onPageChange={setPage}
						itemLabel="movimientos"
					/>
				</>
			)}
		</div>
	);
}
