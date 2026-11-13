import { useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	formatCurrencyWithoutSymbol,
	parseArsToNumber,
	roundToTwoDecimals,
} from '@/utils/formats-money';
import { computeIvaAndTotal, IVA_RATES } from '@/constants/cashflow/iva';
import { createExpense, updateExpense } from '@/lib/expenses/expenses';
import {
	createPayment,
	createPaymentWithWithholding,
	updatePayment,
} from '@/lib/payments/payments';
import type { SupplierExpenseListItem } from '@/lib/suppliers/supplier-expenses';
import type { PaymentWithDetails } from '@/lib/payments/payments';
import {
	getWithholdingByPaymentId,
	percentToRateFraction,
	validateWithholdingInput,
	type Withholding,
} from '@/lib/withholdings/withholdings';
import { uploadFileExpense } from '@/lib/expenses/files-expenses';
import { uploadFilePayment } from '@/lib/payments/files-payments';
import { pluralFiles, attachments, notAttachments } from '@/helpers/attachments/attachments';
import { getLocalDate } from '@/utils/format-date';
import type { StagedFile } from '@/components/business/shared/attachments/file-attachments';

export type ViewState = 'detail' | 'purchase-form' | 'payment-form';

export const NO_BANK_ACCOUNT = '__none__';
export const NO_PAYMENT_METHOD = '__none__';
export const NO_WORK = '__none__';
export const NO_CATEGORY = '__none__';
export const NO_VOUCHER_TYPE = '__none__';

type MutationContext = { kind: 'purchase' | 'payment'; purchaseId: number; withholding?: boolean };

interface UsePurchasePaymentFormsArgs {
	supplierId: number | null;
	onSaved: (ctx: MutationContext) => void | Promise<void>;
	onChanged?: () => void;
}

export function usePurchasePaymentForms({
	supplierId,
	onSaved,
	onChanged,
}: UsePurchasePaymentFormsArgs) {
	const { toast } = useToast();
	const [view, setView] = useState<ViewState>('detail');

	const [editingPurchase, setEditingPurchase] = useState<SupplierExpenseListItem | null>(null);
	const [purchaseDate, setPurchaseDate] = useState(getLocalDate());
	const [purchaseVoucherTypeId, setPurchaseVoucherTypeId] = useState(NO_VOUCHER_TYPE);
	const [purchaseVoucherNumber, setPurchaseVoucherNumber] = useState('');
	const [purchaseWorkId, setPurchaseWorkId] = useState(NO_WORK);
	const [purchaseCategoryId, setPurchaseCategoryId] = useState(NO_CATEGORY);
	const [purchaseDescription, setPurchaseDescription] = useState('');
	const [purchaseNetAmount, setPurchaseNetAmount] = useState('');
	const [purchaseIvaPercent, setPurchaseIvaPercent] = useState<number>(IVA_RATES[0]);
	const [purchaseBankAccountId, setPurchaseBankAccountId] = useState(NO_BANK_ACCOUNT);
	// Optional in both create and edit, so "Sin medio" is always a rendered SelectItem.
	const [purchasePaymentMethodId, setPurchasePaymentMethodId] = useState(NO_PAYMENT_METHOD);
	const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);
	const [stagedPurchaseFiles, setStagedPurchaseFiles] = useState<StagedFile[]>([]);

	const [activePurchaseForPayment, setActivePurchaseForPayment] =
		useState<SupplierExpenseListItem | null>(null);
	const [editingPayment, setEditingPayment] = useState<PaymentWithDetails | null>(null);
	const [paymentAmount, setPaymentAmount] = useState('');
	const [paymentDate, setPaymentDate] = useState(getLocalDate());
	const [paymentBankAccountId, setPaymentBankAccountId] = useState(NO_BANK_ACCOUNT);
	const [paymentMethodIdValue, setPaymentMethodIdValue] = useState(NO_PAYMENT_METHOD);
	const [paymentReceiptNumber, setPaymentReceiptNumber] = useState('');
	const [paymentCategoryId, setPaymentCategoryId] = useState(NO_CATEGORY);
	const [paymentDescription, setPaymentDescription] = useState('');
	const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
	const [stagedPaymentFiles, setStagedPaymentFiles] = useState<StagedFile[]>([]);

	const [withholdingEnabled, setWithholdingEnabled] = useState(false);
	const [withholdingRegime, setWithholdingRegime] = useState('');
	const [withholdingRatePercent, setWithholdingRatePercent] = useState('');
	const [withholdingImputedAmount, setWithholdingImputedAmount] = useState('');

	const [withholdingImputedTouched, setWithholdingImputedTouched] = useState(false);
	const [existingWithholding, setExistingWithholding] = useState<Withholding | null>(null);
	const [loadingExistingWithholding, setLoadingExistingWithholding] = useState(false);

	const withholdingRequestIdRef = useRef(0);

	const submittingPaymentRef = useRef(false);

	// Preview only; the DB trigger (expenses_compute_iva_and_total) recomputes authoritatively.
	const parsedPurchaseNetAmount = roundToTwoDecimals(parseArsToNumber(purchaseNetAmount));
	const { ivaAmount: purchaseIvaAmount, totalAmount: purchaseTotalAmount } = computeIvaAndTotal(
		parsedPurchaseNetAmount,
		purchaseIvaPercent
	);

	const rawWithholdingImputedAmount = parseArsToNumber(withholdingImputedAmount);
	const parsedWithholdingImputedAmount = roundToTwoDecimals(rawWithholdingImputedAmount);
	const withholdingRateFraction = percentToRateFraction(Number(withholdingRatePercent) || 0);
	const withholdingPreviewWithheld = roundToTwoDecimals(
		parsedWithholdingImputedAmount * withholdingRateFraction
	);
	const withholdingPreviewTotal = roundToTwoDecimals(
		parsedWithholdingImputedAmount - withholdingPreviewWithheld
	);

	const resetFormState = () => {
		withholdingRequestIdRef.current += 1;
		setEditingPurchase(null);
		setPurchaseDate(getLocalDate());
		setPurchaseVoucherTypeId(NO_VOUCHER_TYPE);
		setPurchaseVoucherNumber('');
		setPurchaseWorkId(NO_WORK);
		setPurchaseCategoryId(NO_CATEGORY);
		setPurchaseDescription('');
		setPurchaseNetAmount('');
		setPurchaseIvaPercent(IVA_RATES[0]);
		setPurchaseBankAccountId(NO_BANK_ACCOUNT);
		setPurchasePaymentMethodId(NO_PAYMENT_METHOD);
		setActivePurchaseForPayment(null);
		setEditingPayment(null);
		setPaymentAmount('');
		setPaymentDate(getLocalDate());
		setPaymentBankAccountId(NO_BANK_ACCOUNT);
		setPaymentMethodIdValue(NO_PAYMENT_METHOD);
		setPaymentReceiptNumber('');
		setPaymentCategoryId(NO_CATEGORY);
		setPaymentDescription('');
		setStagedPurchaseFiles([]);
		setStagedPaymentFiles([]);
		setWithholdingEnabled(false);
		setWithholdingRegime('');
		setWithholdingRatePercent('');
		setWithholdingImputedAmount('');
		setWithholdingImputedTouched(false);
		setExistingWithholding(null);
		setLoadingExistingWithholding(false);
	};

	const resetOnClose = () => {
		setView('detail');
		resetFormState();
	};

	// Cancel never mutated anything, so it never needs to refetch.
	const cancelForm = () => {
		setView('detail');
		resetFormState();
	};

	const returnToDetail = async (ctx: MutationContext) => {
		setView('detail');
		resetFormState();
		await onSaved(ctx);
	};

	const handleNewPurchase = () => {
		setEditingPurchase(null);
		setPurchaseDate(getLocalDate());
		setPurchaseVoucherTypeId(NO_VOUCHER_TYPE);
		setPurchaseVoucherNumber('');
		setPurchaseWorkId(NO_WORK);
		setPurchaseCategoryId(NO_CATEGORY);
		setPurchaseDescription('');
		setPurchaseNetAmount('');
		setPurchaseIvaPercent(IVA_RATES[0]);
		setPurchaseBankAccountId(NO_BANK_ACCOUNT);
		setPurchasePaymentMethodId(NO_PAYMENT_METHOD);
		setStagedPurchaseFiles([]);
		setView('purchase-form');
	};

	const handleEditPurchase = (purchase: SupplierExpenseListItem) => {
		setEditingPurchase(purchase);
		setPurchaseDate(purchase.date);
		setPurchaseVoucherTypeId(
			purchase.voucher_type_id ? String(purchase.voucher_type_id) : NO_VOUCHER_TYPE
		);
		setPurchaseVoucherNumber(purchase.voucher_number ?? '');
		setPurchaseWorkId(purchase.work_id ? String(purchase.work_id) : NO_WORK);
		setPurchaseCategoryId(purchase.category_id ? String(purchase.category_id) : NO_CATEGORY);
		setPurchaseDescription(purchase.description ?? '');
		setPurchaseNetAmount(formatCurrencyWithoutSymbol(purchase.net_amount));
		setPurchaseIvaPercent(purchase.iva_percent);
		setPurchaseBankAccountId(
			purchase.bank_account_id ? String(purchase.bank_account_id) : NO_BANK_ACCOUNT
		);
		setPurchasePaymentMethodId(
			purchase.payment_method_id ? String(purchase.payment_method_id) : NO_PAYMENT_METHOD
		);
		setStagedPurchaseFiles([]);
		setView('purchase-form');
	};

	const handleNewPayment = (purchase: SupplierExpenseListItem) => {
		setActivePurchaseForPayment(purchase);
		setEditingPayment(null);
		setPaymentAmount('');
		setPaymentDate(getLocalDate());
		// Prefilled from the purchase, but still editable, since it's a sensible default.
		setPaymentBankAccountId(
			purchase.bank_account_id ? String(purchase.bank_account_id) : NO_BANK_ACCOUNT
		);
		setPaymentMethodIdValue(
			purchase.payment_method_id ? String(purchase.payment_method_id) : NO_PAYMENT_METHOD
		);
		setPaymentReceiptNumber('');
		setPaymentCategoryId(NO_CATEGORY);
		setPaymentDescription('');
		setStagedPaymentFiles([]);
		setWithholdingEnabled(false);
		setWithholdingRegime('');
		setWithholdingRatePercent('');
		setWithholdingImputedAmount('');
		setWithholdingImputedTouched(false);
		setExistingWithholding(null);
		setLoadingExistingWithholding(false);
		setView('payment-form');
	};

	const loadExistingWithholding = async (paymentId: number) => {
		const requestId = ++withholdingRequestIdRef.current;
		try {
			const { data, error } = await getWithholdingByPaymentId(paymentId);
			if (requestId !== withholdingRequestIdRef.current) return; // stale: a newer edit session took over
			if (error) throw error;
			setExistingWithholding(data ?? null);
		} catch {
			if (requestId !== withholdingRequestIdRef.current) return;
			setExistingWithholding(null);
		} finally {
			if (requestId === withholdingRequestIdRef.current) {
				setLoadingExistingWithholding(false);
			}
		}
	};

	const handleEditPayment = (purchase: SupplierExpenseListItem, payment: PaymentWithDetails) => {
		setActivePurchaseForPayment(purchase);
		setEditingPayment(payment);
		setPaymentAmount(formatCurrencyWithoutSymbol(payment.amount));
		setPaymentDate(payment.date ?? getLocalDate());
		setPaymentBankAccountId(
			payment.bank_account_id ? String(payment.bank_account_id) : NO_BANK_ACCOUNT
		);
		setPaymentMethodIdValue(
			payment.payment_method_id ? String(payment.payment_method_id) : NO_PAYMENT_METHOD
		);
		setPaymentReceiptNumber(payment.receipt_number ?? '');
		setPaymentCategoryId(payment.category_id ? String(payment.category_id) : NO_CATEGORY);
		setPaymentDescription(payment.description ?? '');
		setStagedPaymentFiles([]);
		setWithholdingEnabled(false);
		setWithholdingRegime('');
		setWithholdingRatePercent('');
		setWithholdingImputedAmount('');
		setWithholdingImputedTouched(false);
		setExistingWithholding(null);
		setLoadingExistingWithholding(true);
		setView('payment-form');
		void loadExistingWithholding(payment.id);
	};

	// Imputado mirrors the payment amount until the user edits it manually.
	const handlePaymentAmountChange = (value: string) => {
		setPaymentAmount(value);
		if (withholdingEnabled && !withholdingImputedTouched) {
			setWithholdingImputedAmount(value);
		}
	};

	const handleWithholdingEnabledChange = (checked: boolean) => {
		setWithholdingEnabled(checked);
		if (checked) {
			setWithholdingImputedTouched(false);
			setWithholdingImputedAmount(paymentAmount);
		}
	};

	const handleWithholdingImputedAmountChange = (value: string) => {
		setWithholdingImputedTouched(true);
		setWithholdingImputedAmount(value);
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
						? await uploadFileExpense(entityId, entry.file, null, entry.fileName)
						: await uploadFilePayment(entityId, entry.file, null, entry.fileName);
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
		if (!Number.isFinite(parsedPurchaseNetAmount) || parsedPurchaseNetAmount < 0) {
			toast({
				title: 'Datos incompletos',
				description: 'Ingresá un neto válido para la compra.',
				variant: 'destructive',
			});
			return;
		}
		setIsSubmittingPurchase(true);
		try {
			const payload = {
				date: purchaseDate,
				voucher_number: purchaseVoucherNumber.trim() || null,
				voucher_type_id:
					purchaseVoucherTypeId === NO_VOUCHER_TYPE ? null : Number(purchaseVoucherTypeId),
				work_id: purchaseWorkId === NO_WORK ? null : Number(purchaseWorkId),
				category_id: purchaseCategoryId === NO_CATEGORY ? null : Number(purchaseCategoryId),
				description: purchaseDescription.trim() || null,
				net_amount: parsedPurchaseNetAmount,
				iva_percent: purchaseIvaPercent,
				iva_amount: purchaseIvaAmount,
				total_amount: purchaseTotalAmount,
				payment_method_id:
					purchasePaymentMethodId === NO_PAYMENT_METHOD ? null : Number(purchasePaymentMethodId),
				bank_account_id:
					purchaseBankAccountId === NO_BANK_ACCOUNT ? null : Number(purchaseBankAccountId),
			};
			if (editingPurchase) {
				const { error } = await updateExpense(editingPurchase.id, {
					...payload,
					supplier_id: supplierId,
				});
				if (error) throw error;
				toast({ title: 'Compra actualizada' });
				onChanged?.();
				await returnToDetail({ kind: 'purchase', purchaseId: editingPurchase.id });
			} else {
				const { data, error } = await createExpense({
					...payload,
					supplier_id: supplierId,
				});
				if (error || !data) throw error;
				const staged = stagedPurchaseFiles;
				const failed = await uploadStagedFiles(staged, data.id, 'purchase');
				setStagedPurchaseFiles([]);
				if (failed > 0) {
					toast({
						variant: 'destructive',
						title: 'Archivos adjuntos pendientes',
						description: `La compra se creó, pero ${failed} de ${pluralFiles(staged.length)} ${notAttachments(failed)}. Podés reintentarlos desde la vista de edición.`,
					});
				} else if (staged.length > 0) {
					toast({
						title: 'Compra creada',
						description: `${attachments(staged.length)} ${pluralFiles(staged.length)}.`,
					});
				} else {
					toast({ title: 'Compra creada' });
				}
				onChanged?.();
				await returnToDetail({ kind: 'purchase', purchaseId: data.id });
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

	const finishPaymentCreated = async (
		paymentId: number,
		purchaseId: number,
		withholding: boolean
	) => {
		const staged = stagedPaymentFiles;
		const failed = await uploadStagedFiles(staged, paymentId, 'payment');
		setStagedPaymentFiles([]);
		if (failed > 0) {
			toast({
				variant: 'destructive',
				title: 'Archivos adjuntos pendientes',
				description: `El pago se creó, pero ${failed} de ${pluralFiles(staged.length)} ${notAttachments(failed)}. Podés reintentarlos desde la vista de edición.`,
			});
		} else if (staged.length > 0) {
			toast({
				title: 'Pago creado',
				description: `${attachments(staged.length)} ${pluralFiles(staged.length)}.`,
			});
		} else {
			toast({ title: 'Pago creado' });
		}
		onChanged?.();
		await returnToDetail({ kind: 'payment', purchaseId, withholding });
	};

	const handleSubmitPayment = async (e: React.FormEvent) => {
		e.preventDefault();
		// Synchronous guard: a second submit before React re-renders with isSubmittingPayment is a no-op.
		if (submittingPaymentRef.current) return;
		submittingPaymentRef.current = true;
		try {
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
			const creatingWithWithholding = !editingPayment && withholdingEnabled;
			if (creatingWithWithholding) {
				const withholdingError = validateWithholdingInput({
					tax_regime: withholdingRegime,
					rate: withholdingRateFraction,
					imputed_amount: rawWithholdingImputedAmount,
				});
				if (withholdingError) {
					toast({
						title: 'Datos incompletos',
						description: withholdingError,
						variant: 'destructive',
					});
					return;
				}
			}
			setIsSubmittingPayment(true);
			try {
				const amountToSend =
					editingPayment && (loadingExistingWithholding || existingWithholding)
						? editingPayment.amount
						: roundToTwoDecimals(parsedAmount);
				const payload = {
					date: paymentDate,
					amount: amountToSend,
					bank_account_id:
						paymentBankAccountId === NO_BANK_ACCOUNT ? null : Number(paymentBankAccountId),
					payment_method_id:
						paymentMethodIdValue === NO_PAYMENT_METHOD ? null : Number(paymentMethodIdValue),
					expense_id: activePurchaseForPayment.id,
					description: paymentDescription.trim() || null,
					receipt_number: paymentReceiptNumber.trim() || null,
					category_id: paymentCategoryId === NO_CATEGORY ? null : Number(paymentCategoryId),
					work_id: activePurchaseForPayment.work_id ?? null,
				};
				if (editingPayment) {
					const { error } = await updatePayment(editingPayment.id, payload);
					if (error) throw error;
					toast({ title: 'Pago actualizado' });
					onChanged?.();
					await returnToDetail({ kind: 'payment', purchaseId: activePurchaseForPayment.id });
				} else if (creatingWithWithholding) {
					const { data, error } = await createPaymentWithWithholding(payload, {
						tax_regime: withholdingRegime.trim(),
						rate: withholdingRateFraction,
						imputed_amount: parsedWithholdingImputedAmount,
					});
					if (error || !data) throw error;
					await finishPaymentCreated(data.id, activePurchaseForPayment.id, true);
				} else {
					const { data, error } = await createPayment(payload);
					if (error || !data) throw error;
					await finishPaymentCreated(data.id, activePurchaseForPayment.id, false);
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
		} finally {
			submittingPaymentRef.current = false;
		}
	};

	const remainingPurchaseBalance = activePurchaseForPayment
		? activePurchaseForPayment.balanceArs + (editingPayment ? editingPayment.amount : 0)
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
		purchaseDate,
		setPurchaseDate,
		purchaseVoucherTypeId,
		setPurchaseVoucherTypeId,
		purchaseVoucherNumber,
		setPurchaseVoucherNumber,
		purchaseWorkId,
		setPurchaseWorkId,
		purchaseCategoryId,
		setPurchaseCategoryId,
		purchaseDescription,
		setPurchaseDescription,
		purchaseNetAmount,
		setPurchaseNetAmount,
		purchaseIvaPercent,
		setPurchaseIvaPercent,
		purchaseIvaAmount,
		purchaseTotalAmount,
		purchaseBankAccountId,
		setPurchaseBankAccountId,
		purchasePaymentMethodId,
		setPurchasePaymentMethodId,
		isSubmittingPurchase,
		stagedPurchaseFiles,
		setStagedPurchaseFiles,
		activePurchaseForPayment,
		editingPayment,
		paymentAmount,
		setPaymentAmount,
		paymentDate,
		setPaymentDate,
		paymentBankAccountId,
		setPaymentBankAccountId,
		paymentMethodIdValue,
		setPaymentMethodIdValue,
		paymentReceiptNumber,
		setPaymentReceiptNumber,
		paymentCategoryId,
		setPaymentCategoryId,
		paymentDescription,
		setPaymentDescription,
		isSubmittingPayment,
		stagedPaymentFiles,
		setStagedPaymentFiles,
		remainingPurchaseBalance,
		paymentExceedsBalance,
		handlePaymentAmountChange,
		withholdingEnabled,
		onWithholdingEnabledChange: handleWithholdingEnabledChange,
		withholdingRegime,
		setWithholdingRegime,
		withholdingRatePercent,
		setWithholdingRatePercent,
		withholdingImputedAmount,
		onWithholdingImputedAmountChange: handleWithholdingImputedAmountChange,
		withholdingPreviewWithheld,
		withholdingPreviewTotal,
		existingWithholding,
		loadingExistingWithholding,
		resetOnClose,
		cancelForm,
		returnToDetail,
		handleNewPurchase,
		handleEditPurchase,
		handleNewPayment,
		handleEditPayment,
		handleSubmitPurchase,
		handleSubmitPayment,
	};
}
