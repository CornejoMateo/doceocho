'use client';

import { EditOnly } from '@/components/permissions/edit-scope';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { paginateAndFilter } from '@/utils/pagination';
import { formatDateOnly } from '@/utils/format-date';
import { formatCurrency } from '@/utils/formats-money';
import { MONTH_LABELS_ES } from '@/helpers/fixed-expenses/fixed-expenses-summary';
import { FixedExpensePaymentWithDetails } from '@/lib/fixed-expenses/fixed-expense-payments';

const PAGE_SIZE = 10;

type FixedExpensePaymentsListProps = {
	payments: FixedExpensePaymentWithDetails[];
	loading: boolean;
	error: string | null;
	onRetry: () => void;
	year: number;
	onEdit: (payment: FixedExpensePaymentWithDetails) => void;
	onDelete: (payment: FixedExpensePaymentWithDetails) => void;
};

export function monthLabel(period: string): string {
	return MONTH_LABELS_ES[Number(period.slice(5, 7)) - 1] ?? '';
}

function methodAndAccount(payment: FixedExpensePaymentWithDetails): string {
	return payment.bank_account_label
		? `${payment.payment_method_name} - ${payment.bank_account_label}`
		: payment.payment_method_name;
}

export function FixedExpensePaymentsList({
	payments,
	loading,
	error,
	onRetry,
	year,
	onEdit,
	onDelete,
}: FixedExpensePaymentsListProps) {
	const [page, setPage] = useState(1);

	// a year change loads a different data set, so start back at page 1
	useEffect(() => {
		setPage(1);
	}, [year]);

	const { paginatedData, totalPages, totalItems } = useMemo(
		() => paginateAndFilter(payments, '', page, PAGE_SIZE, () => true),
		[payments, page]
	);
	const currentPage = Math.min(Math.max(page, 1), totalPages || 1);

	const renderActions = (payment: FixedExpensePaymentWithDetails, withLabel: boolean) => {
		const size = withLabel ? 'default' : 'sm';
		const buttonClass = withLabel ? 'flex-1 gap-2' : '';
		return (
			<>
				<EditOnly edit="cash-flow">
					<Button
						variant={withLabel ? 'outline' : 'ghost'}
						size={size}
						aria-label="Editar pago"
						title="Editar pago"
						className={buttonClass}
						onClick={() => onEdit(payment)}
					>
						<Pencil className="h-4 w-4" />
						{withLabel && 'Editar'}
					</Button>
				</EditOnly>
				<EditOnly edit="cash-flow">
					<Button
						variant={withLabel ? 'outline' : 'ghost'}
						size={size}
						aria-label="Eliminar pago"
						title="Eliminar pago"
						className={`text-destructive ${buttonClass}`}
						onClick={() => onDelete(payment)}
					>
						<Trash2 className="h-4 w-4" />
						{withLabel && 'Eliminar'}
					</Button>
				</EditOnly>
			</>
		);
	};

	if (error) {
		return (
			<Alert variant="destructive">
				<AlertCircle />
				<AlertTitle>No se pudieron cargar los pagos</AlertTitle>
				<AlertDescription className="space-y-2">
					<p>{error}</p>
					<Button variant="outline" size="sm" onClick={onRetry} disabled={loading}>
						Reintentar
					</Button>
				</AlertDescription>
			</Alert>
		);
	}

	if (loading) {
		return (
			<div className="flex justify-center py-12">
				<Spinner className="size-8" aria-label="Cargando pagos" />
			</div>
		);
	}

	if (payments.length === 0) {
		return (
			<Card className="bg-card border-border p-8 text-center text-muted-foreground">
				No hay pagos registrados
			</Card>
		);
	}

	return (
		<>
			<div className="hidden md:block" data-testid="fixed-expense-payments-desktop">
				<Card className="bg-card border-border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="text-center">Fecha</TableHead>
								<TableHead className="text-center">Concepto</TableHead>
								<TableHead className="text-center">Categoría</TableHead>
								<TableHead className="text-center">Neto</TableHead>
								<TableHead className="text-center">IVA %</TableHead>
								<TableHead className="text-center">IVA</TableHead>
								<TableHead className="text-center">Total</TableHead>
								<TableHead className="text-center">Medio / Cuenta</TableHead>
								<TableHead className="text-center">Mes</TableHead>
								<TableHead className="text-center">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{paginatedData.map((payment) => (
								<TableRow key={payment.id}>
									<TableCell className="text-center">{formatDateOnly(payment.paid_date)}</TableCell>
									<TableCell className="text-center">{payment.description}</TableCell>
									<TableCell className="text-center">{payment.category_name}</TableCell>
									<TableCell className="text-center">
										{formatCurrency(payment.net_amount)}
									</TableCell>
									<TableCell className="text-center">{payment.iva_percent}%</TableCell>
									<TableCell className="text-center">
										{formatCurrency(payment.iva_amount)}
									</TableCell>
									<TableCell className="text-center">
										{formatCurrency(payment.total_amount)}
									</TableCell>
									<TableCell className="text-center">{methodAndAccount(payment)}</TableCell>
									<TableCell className="text-center">{monthLabel(payment.period)}</TableCell>
									<TableCell className="text-center">
										<div className="flex justify-center gap-2">{renderActions(payment, false)}</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			</div>

			<div className="md:hidden space-y-3" data-testid="fixed-expense-payments-mobile">
				{paginatedData.map((payment) => (
					<Card key={payment.id} className="bg-card border-border p-4 space-y-2">
						<div className="flex items-center justify-between gap-2">
							<span className="font-medium min-w-0 break-words">{payment.description}</span>
							<span className="text-sm text-muted-foreground shrink-0">
								{formatDateOnly(payment.paid_date)}
							</span>
						</div>
						<dl className="space-y-1 text-sm">
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Categoría</dt>
								<dd>{payment.category_name}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Neto</dt>
								<dd>{formatCurrency(payment.net_amount)}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">IVA ({payment.iva_percent}%)</dt>
								<dd>{formatCurrency(payment.iva_amount)}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Total</dt>
								<dd>{formatCurrency(payment.total_amount)}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Medio / Cuenta</dt>
								<dd>{methodAndAccount(payment)}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Mes</dt>
								<dd>{monthLabel(payment.period)}</dd>
							</div>
						</dl>
						<div className="flex gap-2 pt-1">{renderActions(payment, true)}</div>
					</Card>
				))}
			</div>

			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={totalItems}
				itemsPerPage={PAGE_SIZE}
				onPageChange={setPage}
				itemLabel="pagos"
			/>
		</>
	);
}
