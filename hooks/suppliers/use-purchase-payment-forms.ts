import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { formatCurrencyWithoutSymbol, parseArsToNumber } from '@/utils/formats-money';
import type { PurchaseSupplierWithPayments } from '@/lib/suppliers/account-summary';
import {
	createPurchaseSupplier,
	updatePurchaseSupplier,
} from '@/lib/suppliers/purchases-suppliers';
import {
	createPaymentSupplier,
	updatePaymentSupplier,
	type PaymentSupplier,
} from '@/lib/suppliers/payments-suppliers';
import { uploadFilePurchaseSupplier } from '@/lib/suppliers/files-purchases-suppliers';
import { uploadFilePaymentSupplier } from '@/lib/suppliers/files-payments-suppliers';
import { pluralArchivos, adjuntaron, noPudieronAdjuntar } from '@/helpers/suppliers/suppliers';
import type { StagedFile } from '@/components/business/suppliers/supplier-file-attachments';

export type ViewState = 'detail' | 'purchase-form' | 'payment-form';

export const NO_BANK_ACCOUNT = '__none__';
export const NO_PAYMENT_METHOD = '__none__';

interface UsePurchasePaymentFormsArgs {
	supplierId: number | null;
	fetchDetail: () => Promise<void>;
	onChanged?: () => void;
}

export function usePurchasePaymentForms({
	supplierId,
	fetchDetail,
	onChanged,
}: UsePurchasePaymentFormsArgs) {
	const { toast } = useToast();
	const [view, setView] = useState<ViewState>('detail');

	const [editingPurchase, setEditingPurchase] = useState<PurchaseSupplierWithPayments | null>(null);
	const [purchaseAmount, setPurchaseAmount] = useState('');
	const [purchaseNotes, setPurchaseNotes] = useState('');
	const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
	const [stagedPurchaseFiles, setStagedPurchaseFiles] = useState<StagedFile[]>([]);

	const [activePurchaseForPayment, setActivePurchaseForPayment] =
		useState<PurchaseSupplierWithPayments | null>(null);
	const [editingPayment, setEditingPayment] = useState<PaymentSupplier | null>(null);
	const [paymentAmount, setPaymentAmount] = useState('');
	const [paymentBankAccountId, setPaymentBankAccountId] = useState(NO_BANK_ACCOUNT);
	const [paymentMethodIdValue, setPaymentMethodIdValue] = useState(NO_PAYMENT_METHOD);
	const [paymentNotes, setPaymentNotes] = useState('');
	const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
	const [stagedPaymentFiles, setStagedPaymentFiles] = useState<StagedFile[]>([]);

	const resetFormState = () => {
		setEditingPurchase(null);
		setPurchaseAmount('');
		setPurchaseNotes('');
		setActivePurchaseForPayment(null);
		setEditingPayment(null);
		setPaymentAmount('');
		setPaymentBankAccountId(NO_BANK_ACCOUNT);
		setPaymentMethodIdValue(NO_PAYMENT_METHOD);
		setPaymentNotes('');
		// A surviving staged list would attach the previous form's files to the next purchase/payment.
		setStagedPurchaseFiles([]);
		setStagedPaymentFiles([]);
	};

	const resetOnClose = () => {
		setView('detail');
		resetFormState();
	};

	const returnToDetail = async () => {
		setView('detail');
		resetFormState();
		await fetchDetail();
	};

	const handleNewPurchase = () => {
		setEditingPurchase(null);
		setPurchaseAmount('');
		setPurchaseNotes('');
		setStagedPurchaseFiles([]);
		setView('purchase-form');
	};

	const handleEditPurchase = (purchase: PurchaseSupplierWithPayments) => {
		setEditingPurchase(purchase);
		setPurchaseAmount(formatCurrencyWithoutSymbol(purchase.amount_ars));
		setPurchaseNotes(purchase.notes ?? '');
		setStagedPurchaseFiles([]);
		setView('purchase-form');
	};

	const handleNewPayment = (purchase: PurchaseSupplierWithPayments) => {
		setActivePurchaseForPayment(purchase);
		setEditingPayment(null);
		setPaymentAmount('');
		setPaymentBankAccountId(NO_BANK_ACCOUNT);
		setPaymentMethodIdValue(NO_PAYMENT_METHOD);
		setPaymentNotes('');
		setStagedPaymentFiles([]);
		setView('payment-form');
	};

	const handleEditPayment = (purchase: PurchaseSupplierWithPayments, payment: PaymentSupplier) => {
		setActivePurchaseForPayment(purchase);
		setEditingPayment(payment);
		setPaymentAmount(formatCurrencyWithoutSymbol(payment.amount_ars));
		setPaymentBankAccountId(
			payment.bank_account_id ? String(payment.bank_account_id) : NO_BANK_ACCOUNT
		);
		setPaymentMethodIdValue(
			payment.payment_method_id ? String(payment.payment_method_id) : NO_PAYMENT_METHOD
		);
		setPaymentNotes(payment.notes ?? '');
		setStagedPaymentFiles([]);
		setView('payment-form');
	};

	const uploadStagedFiles = async (
		staged: StagedFile[],
		entityId: number,
		kind: 'purchase' | 'payment'
	): Promise<number> => {
		let failed = 0;
		for (const entry of staged) {
			try {
				const { error } =
					kind === 'purchase'
						? await uploadFilePurchaseSupplier(entityId, entry.file, null, entry.fileName)
						: await uploadFilePaymentSupplier(entityId, entry.file, null, entry.fileName);
				if (error) failed += 1;
			} catch {
				// Counted, not rethrown
				failed += 1;
			}
		}
		return failed;
	};

	const handleSubmitPurchase = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!supplierId) return;
		const parsedAmount = parseArsToNumber(purchaseAmount);
		if (!purchaseAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			toast({
				title: 'Datos incompletos',
				description: 'Ingresá un monto válido para la compra.',
				variant: 'destructive',
			});
			return;
		}
		setIsSubmittingPurchase(true);
		try {
			if (editingPurchase) {
				const { error } = await updatePurchaseSupplier(editingPurchase.id, {
					amount_ars: parsedAmount,
					notes: purchaseNotes.trim() || null,
				});
				if (error) throw error;
				toast({ title: 'Compra actualizada' });
				onChanged?.();
				await returnToDetail();
			} else {
				const { data, error } = await createPurchaseSupplier({
					amount_ars: parsedAmount,
					supplier_id: supplierId,
					notes: purchaseNotes.trim() || null,
				});
				if (error || !data) throw error;
				const staged = stagedPurchaseFiles;
				const failed = await uploadStagedFiles(staged, data.id, 'purchase');
				setStagedPurchaseFiles([]);
				if (failed > 0) {
					toast({
						variant: 'destructive',
						title: 'Archivos adjuntos pendientes',
						description: `La compra se creó, pero ${failed} de ${pluralArchivos(staged.length)} ${noPudieronAdjuntar(failed)}. Podés reintentarlos desde la vista de edición.`,
					});
				} else if (staged.length > 0) {
					toast({
						title: 'Compra creada',
						description: `${adjuntaron(staged.length)} ${pluralArchivos(staged.length)}.`,
					});
				} else {
					toast({ title: 'Compra creada' });
				}
				onChanged?.();
				await returnToDetail();
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo guardar la compra.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmittingPurchase(false);
		}
	};

	const handleSubmitPayment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!activePurchaseForPayment) return;
		const parsedAmount = parseArsToNumber(paymentAmount);
		if (!paymentAmount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			toast({
				title: 'Datos incompletos',
				description: 'Ingresá un monto válido para el pago.',
				variant: 'destructive',
			});
			return;
		}
		setIsSubmittingPayment(true);
		try {
			const payload = {
				amount_ars: parsedAmount,
				bank_account_id:
					paymentBankAccountId === NO_BANK_ACCOUNT ? null : Number(paymentBankAccountId),
				payment_method_id:
					paymentMethodIdValue === NO_PAYMENT_METHOD ? null : Number(paymentMethodIdValue),
				purchase_supplier_id: activePurchaseForPayment.id,
				notes: paymentNotes.trim() || null,
			};
			if (editingPayment) {
				const { error } = await updatePaymentSupplier(editingPayment.id, payload);
				if (error) throw error;
				toast({ title: 'Pago actualizado' });
				onChanged?.();
				await returnToDetail();
			} else {
				const { data, error } = await createPaymentSupplier(payload);
				if (error || !data) throw error;
				const staged = stagedPaymentFiles;
				const failed = await uploadStagedFiles(staged, data.id, 'payment');
				setStagedPaymentFiles([]);
				if (failed > 0) {
					// Keep the row: the typed-in data is valid and the user can retry the files from edit.
					toast({
						variant: 'destructive',
						title: 'Archivos adjuntos pendientes',
						description: `El pago se creó, pero ${failed} de ${pluralArchivos(staged.length)} ${noPudieronAdjuntar(failed)}. Podés reintentarlos desde la vista de edición.`,
					});
				} else if (staged.length > 0) {
					toast({
						title: 'Pago creado',
						description: `${adjuntaron(staged.length)} ${pluralArchivos(staged.length)}.`,
					});
				} else {
					toast({ title: 'Pago creado' });
				}
				onChanged?.();
				await returnToDetail();
			}
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo guardar el pago.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmittingPayment(false);
		}
	};

	const remainingPurchaseBalance = activePurchaseForPayment
		? activePurchaseForPayment.balanceArs + (editingPayment ? editingPayment.amount_ars : 0)
		: 0;
	const parsedPaymentAmount = parseArsToNumber(paymentAmount);
	const paymentExceedsBalance =
		paymentAmount.length > 0 &&
		Number.isFinite(parsedPaymentAmount) &&
		parsedPaymentAmount > remainingPurchaseBalance &&
		remainingPurchaseBalance > 0;

	return {
		view,
		setView,
		editingPurchase,
		purchaseAmount,
		setPurchaseAmount,
		purchaseNotes,
		setPurchaseNotes,
		isSubmittingPurchase,
		stagedPurchaseFiles,
		setStagedPurchaseFiles,
		activePurchaseForPayment,
		editingPayment,
		paymentAmount,
		setPaymentAmount,
		paymentBankAccountId,
		setPaymentBankAccountId,
		paymentMethodIdValue,
		setPaymentMethodIdValue,
		paymentNotes,
		setPaymentNotes,
		isSubmittingPayment,
		stagedPaymentFiles,
		setStagedPaymentFiles,
		remainingPurchaseBalance,
		paymentExceedsBalance,
		resetOnClose,
		returnToDetail,
		handleNewPurchase,
		handleEditPurchase,
		handleNewPayment,
		handleEditPayment,
		handleSubmitPurchase,
		handleSubmitPayment,
	};
}
