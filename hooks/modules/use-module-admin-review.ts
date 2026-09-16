'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { reviewModuleFileAction } from '@/lib/modules/modules-files-review';
import { submitModuleReviewAction } from '@/lib/modules/modules-review-submit';
import { deriveModuleStatusFromFiles } from '@/lib/modules/modules-files';
import { Module } from '@/lib/modules/modules';
import { getModulesSettings } from '@/lib/modules/modules-settings';
import { ModuleFileWithUrl } from './use-module-details-files';
import { formatCurrencyWithoutSymbol, parseArsToNumber } from '@/utils/formats-money';

interface UseModuleAdminReviewOptions {
	open: boolean;
	module: Module | null;
	files: ModuleFileWithUrl[];
	patchFile: (id: number, patch: Partial<ModuleFileWithUrl>) => void;
	onReviewed?: () => void;
	onOpenChange?: (open: boolean) => void;
}

export function useModuleAdminReview({
	open,
	module,
	files,
	patchFile,
	onReviewed,
	onOpenChange,
}: UseModuleAdminReviewOptions) {
	const moduleId = module?.id ?? null;
	const [reviewingFileId, setReviewingFileId] = useState<number | null>(null);
	const [reviewText, setReviewText] = useState('');

	const [pendingReviewIds, setPendingReviewIds] = useState<Map<number, 'approved' | 'rejected'>>(
		new Map()
	);

	const [moduleReviewText, setModuleReviewText] = useState('');
	const [isSubmittingModuleReview, setIsSubmittingModuleReview] = useState(false);

	const [amountModalOpen, setAmountModalOpen] = useState(false);
	const [amountValue, setAmountValue] = useState('');
	const [amountError, setAmountError] = useState<string | null>(null);
	const [loadingDefaultPrice, setLoadingDefaultPrice] = useState(false);

	const closedRef = useRef(!open);

	const currentModuleIdRef = useRef<number | null>(moduleId);

	const amountRequestIdRef = useRef(0);

	useEffect(() => {
		closedRef.current = !open;
	}, [open]);

	useEffect(() => {
		currentModuleIdRef.current = moduleId;
	}, [moduleId]);

	useEffect(() => {
		return () => {
			closedRef.current = true;
		};
	}, []);

	useEffect(() => {
		if (!open) {
			setReviewingFileId(null);
			setReviewText('');
			setPendingReviewIds(new Map());
			setModuleReviewText('');
			setIsSubmittingModuleReview(false);
			setAmountModalOpen(false);
			setAmountValue('');
			setAmountError(null);
			setLoadingDefaultPrice(false);
			amountRequestIdRef.current += 1;
		}
	}, [open]);

	useEffect(() => {
		if (open && module) {
			setModuleReviewText(module.admin_description || '');
		}
	}, [open, moduleId]);

	const startFileReview = (fileId: number) => {
		const file = files.find((f) => f.id === fileId);
		setReviewingFileId(fileId);

		setReviewText(file?.admin_description ?? '');
	};

	const cancelFileReview = () => {
		setReviewingFileId(null);
		setReviewText('');
	};

	const submitFileReview = async (file: ModuleFileWithUrl, status: 'approved' | 'rejected') => {
		if (!module) return;
		const adminDescription = reviewText.trim() || null;

		const requestModuleId = module.id;

		setPendingReviewIds((prev) => new Map(prev).set(file.id, status));

		const { success, error, warning } = await reviewModuleFileAction(
			file.id,
			status,
			adminDescription
		);

		if (closedRef.current || currentModuleIdRef.current !== requestModuleId) return;

		setPendingReviewIds((prev) => {
			const next = new Map(prev);
			next.delete(file.id);
			return next;
		});

		if (!success) {
			toast({
				variant: 'destructive',
				title: 'Error al revisar el archivo',
				description: error || 'Ocurrió un error al procesar la revisión del archivo.',
			});
			return;
		}

		patchFile(file.id, { status, admin_description: adminDescription });
		toast({
			title: status === 'approved' ? 'Archivo aprobado' : 'Archivo rechazado',
			description:
				status === 'approved'
					? 'El archivo fue aprobado correctamente.'
					: 'El archivo fue rechazado correctamente.',
		});
		if (warning) {
			toast({
				variant: 'destructive',
				title: 'Atención',
				description: warning,
			});
		}

		if (reviewingFileId === file.id) {
			cancelFileReview();
		}
	};

	const allFilesReviewed = files.length > 0 && files.every((f) => !!f.status);

	const submitModuleReview = async (amount: number | null) => {
		if (!module) return;
		setIsSubmittingModuleReview(true);
		const { success, error } = await submitModuleReviewAction(
			module.id,
			moduleReviewText.trim() || null,
			amount
		);
		setIsSubmittingModuleReview(false);
		if (!success) {
			toast({
				variant: 'destructive',
				title: 'Error al enviar la respuesta',
				description: error || 'Ocurrió un error al enviar la respuesta del módulo.',
			});
			return;
		}
		const derivedStatus = deriveModuleStatusFromFiles(files);
		toast({
			title: derivedStatus === 'approved' ? 'Módulo aprobado' : 'Módulo rechazado',
			description:
				derivedStatus === 'approved'
					? 'La respuesta general se envió y el módulo quedó aprobado.'
					: 'La respuesta general se envió y el módulo quedó rechazado.',
		});
		amountRequestIdRef.current += 1;
		setAmountModalOpen(false);
		setAmountValue('');
		setAmountError(null);
		onReviewed?.();
		onOpenChange?.(false);
	};

	const handleSendResponseClick = async () => {
		if (!module) return;
		const derivedStatus = deriveModuleStatusFromFiles(files);
		if (derivedStatus === 'approved') {
			const requestId = ++amountRequestIdRef.current;
			const requestModuleId = module.id;

			setAmountValue('');
			setAmountError(null);
			setAmountModalOpen(true);
			setLoadingDefaultPrice(true);

			const { data, error } = await getModulesSettings();

			if (
				closedRef.current ||
				currentModuleIdRef.current !== requestModuleId ||
				amountRequestIdRef.current !== requestId
			) {
				return;
			}

			setLoadingDefaultPrice(false);

			if (!error && data?.price_per_module != null) {
				setAmountValue(formatCurrencyWithoutSymbol(data.price_per_module));
			}
			return;
		}
		submitModuleReview(null);
	};

	const cancelAmountModal = () => {
		amountRequestIdRef.current += 1;
		setAmountModalOpen(false);
		setAmountValue('');
		setAmountError(null);
		setLoadingDefaultPrice(false);
	};

	const confirmAmountAndSubmit = () => {
		const parsed = parseArsToNumber(amountValue);
		if (!amountValue.trim() || Number.isNaN(parsed) || parsed <= 0) {
			setAmountError('Ingresá un monto válido mayor a 0.');
			return;
		}
		submitModuleReview(parsed);
	};

	const changeAmountValue = (value: string) => {
		setAmountValue(value);
		setAmountError(null);
	};

	return {
		reviewingFileId,
		reviewText,
		setReviewText,
		pendingReviewIds,
		startFileReview,
		cancelFileReview,
		submitFileReview,
		moduleReviewText,
		setModuleReviewText,
		isSubmittingModuleReview,
		allFilesReviewed,
		amountModalOpen,
		amountValue,
		amountError,
		loadingDefaultPrice,
		changeAmountValue,
		handleSendResponseClick,
		cancelAmountModal,
		confirmAmountAndSubmit,
	};
}
