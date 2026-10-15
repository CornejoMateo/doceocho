import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/utils/formats-money';
import { computeCollectionPaymentByMethod } from '@/helpers/collection-payment/collection-payment-summary';
import type { CollectionPaymentEntry } from '@/hooks/collection-payment/use-collection-payment-tab';
import { PaymentMethod } from '@/lib/payment-methods/payment-methods';

type CollectionPaymentByMethodProps = {
	entries: CollectionPaymentEntry[];
	paymentMethods: PaymentMethod[];
};

export function CollectionPaymentByMethod({
	entries,
	paymentMethods,
}: CollectionPaymentByMethodProps) {
	const byMethod = useMemo(
		() => computeCollectionPaymentByMethod(entries, paymentMethods),
		[entries, paymentMethods]
	);
	const totalAmount = useMemo(() => byMethod.reduce((sum, row) => sum + row.amount, 0), [byMethod]);

	return (
		<Card className="bg-card border-border">
			<CardHeader>
				<CardTitle className="text-base">Por cuenta / medio</CardTitle>
			</CardHeader>
			<CardContent>
				{byMethod.length === 0 ? (
					<p className="text-sm text-muted-foreground">No hay cuentas/medios con movimientos</p>
				) : (
					<div className="max-h-72 overflow-y-auto overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-center">Cuenta</TableHead>
									<TableHead className="text-center">Monto</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{byMethod.map((row) => (
									<TableRow key={row.paymentMethodId}>
										<TableCell className="text-center">{row.paymentMethodName}</TableCell>
										<TableCell className="text-center">{formatCurrency(row.amount)}</TableCell>
									</TableRow>
								))}
								<TableRow className="font-semibold">
									<TableCell className="text-center">Total</TableCell>
									<TableCell className="text-center">{formatCurrency(totalAmount)}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
