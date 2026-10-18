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
import { Edit, Trash2 } from 'lucide-react';
import { CollectionPaymentEntry } from '@/hooks/collection-payment/use-collection-payment-tab';
import { usePaginatedRows } from '@/hooks/use-paginated-rows';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { formatCurrency } from '@/utils/formats-money';
import { formatDateOnly } from '@/utils/format-date';

const PAGE_SIZE = 20;

type CollectionPaymentListProps = {
	entries: CollectionPaymentEntry[];
	loading: boolean;
	partyLabel: string;
	emptyLabel: string;
	onEdit: (entry: CollectionPaymentEntry) => void;
	onAskDelete: (entry: CollectionPaymentEntry) => void;
	pageResetKey?: string;
};

export function CollectionPaymentList({
	entries,
	loading,
	partyLabel,
	emptyLabel,
	onEdit,
	onAskDelete,
	pageResetKey = '',
}: CollectionPaymentListProps) {
	const { paginatedData, currentPage, totalPages, totalItems, setPage } = usePaginatedRows(
		entries,
		PAGE_SIZE,
		pageResetKey
	);

	const renderActions = (entry: CollectionPaymentEntry, withLabel: boolean) => {
		const size = withLabel ? 'default' : 'sm';
		const buttonClass = withLabel ? 'flex-1 gap-2' : '';
		return (
			<>
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
					<div className="hidden md:block" data-testid="collection-payment-desktop">
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
										<TableHead className="text-center">Medio de pago</TableHead>
										<TableHead className="text-center">Monto</TableHead>
										<TableHead className="text-center">Acciones</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{paginatedData.map((entry) => (
										<TableRow key={`${entry.source ?? 'g'}-${entry.id}`}>
											<TableCell className="text-center whitespace-nowrap">
												{formatDateOnly(entry.date)}
											</TableCell>
											<TableCell className="text-center">{entry.receipt_number || '-'}</TableCell>
											<TableCell className="text-center">{entry.party_name || '-'}</TableCell>
											<TableCell className="text-center">{entry.work_name || '-'}</TableCell>
											<TableCell className="text-center">{entry.category_name || '-'}</TableCell>
											<TableCell className="text-center max-w-[200px] truncate">
												{entry.description || '-'}
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
											<TableCell className="text-center font-medium">
												{formatCurrency(entry.amount)}
											</TableCell>
											<TableCell className="text-center">
												<div className="flex justify-center gap-2">
													{renderActions(entry, false)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					</div>

					<div className="md:hidden space-y-3" data-testid="collection-payment-mobile">
						{paginatedData.map((entry) => (
							<Card
								key={`${entry.source ?? 'g'}-${entry.id}`}
								className="bg-card border-border p-4 space-y-3"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium">{formatDateOnly(entry.date)}</span>
									<span className="font-semibold">{formatCurrency(entry.amount)}</span>
								</div>
								<dl className="space-y-1 text-sm">
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">{partyLabel}</dt>
										<dd className="text-right">{entry.party_name || '-'}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Comprobante</dt>
										<dd className="text-right">{entry.receipt_number || '-'}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Obra</dt>
										<dd className="text-right">{entry.work_name || '-'}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Categoría</dt>
										<dd className="text-right">{entry.category_name || '-'}</dd>
									</div>
									{entry.description && (
										<div className="flex justify-between gap-2">
											<dt className="text-muted-foreground">Detalle</dt>
											<dd className="text-right break-words">{entry.description}</dd>
										</div>
									)}
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Medio de pago</dt>
										<dd className="text-right">
											{entry.payment_method_name || '-'}
											{entry.bank_account_name ? ` · ${entry.bank_account_name}` : ''}
										</dd>
									</div>
								</dl>
								<div className="flex gap-2 pt-1">{renderActions(entry, true)}</div>
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
