import { PaymentMethod } from '@/lib/payment-methods/payment-methods';
import type { CollectionPaymentEntry } from '@/hooks/collection-payment/use-collection-payment-tab';

export type CollectionPaymentMethodRow = {
	paymentMethodId: number;
	paymentMethodName: string;
	amount: number;
};

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Mirrors Excel's "POR CUENTA / MEDIO" block, sorted by amount descending; includes inactive methods with movements.
export function computeCollectionPaymentByMethod(
	entries: CollectionPaymentEntry[],
	paymentMethods: PaymentMethod[]
): CollectionPaymentMethodRow[] {
	const amountByMethod = new Map<number, number>();
	const nameByMethod = new Map<number, string>();
	for (const entry of entries) {
		// A supplier payment created from the Suppliers module can have no payment method at all.
		if (entry.payment_method_id == null) continue;
		amountByMethod.set(
			entry.payment_method_id,
			(amountByMethod.get(entry.payment_method_id) ?? 0) + Number(entry.amount)
		);
		if (!nameByMethod.has(entry.payment_method_id))
			nameByMethod.set(entry.payment_method_id, entry.payment_method_name ?? '');
	}

	const rows = new Map<number, CollectionPaymentMethodRow>();
	for (const method of paymentMethods) {
		// skip inactive methods with no movements, so they stay hidden
		if (!method.is_active && !amountByMethod.has(method.id)) continue;
		rows.set(method.id, {
			paymentMethodId: method.id,
			paymentMethodName: method.name,
			amount: round2(amountByMethod.get(method.id) ?? 0),
		});
	}
	// entries whose payment_method_id isn't in the paymentMethods list at all
	for (const [paymentMethodId, amount] of amountByMethod) {
		if (rows.has(paymentMethodId)) continue;
		rows.set(paymentMethodId, {
			paymentMethodId,
			paymentMethodName: nameByMethod.get(paymentMethodId) ?? '',
			amount: round2(amount),
		});
	}

	return Array.from(rows.values()).sort((a, b) => b.amount - a.amount);
}
