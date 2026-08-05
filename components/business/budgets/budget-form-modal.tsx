'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Work } from '@/lib/works/works';
import { BudgetWithWork } from '@/lib/balances/balances';
import { FORM_DEFAULTS } from '@/constants/budgets/constants';
import { listMaterials } from '@/lib/checklists/materials';
import { Material } from '@/lib/checklists/materials';
import { BudgetFormData } from '@//components/business/reports/budgets/types';
import { Info } from 'lucide-react';
import { formatNumber, parseArsToNumber } from '@/utils/formats-money';

interface BudgetFormModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'create' | 'edit';
	works: Work[];
	budget?: BudgetWithWork | null;
	onSubmit: (data: BudgetFormData) => Promise<void>;
	isLoading: boolean;
}

export function BudgetFormModal({
	isOpen,
	onOpenChange,
	mode,
	works,
	budget,
	onSubmit,
	isLoading,
}: BudgetFormModalProps) {
	const [formData, setFormData] = useState<BudgetFormData>({
		type: FORM_DEFAULTS.type,
		number: FORM_DEFAULTS.number,
		amount: FORM_DEFAULTS.amount,
		amountUsd: FORM_DEFAULTS.amountUsd,
		usdRate: FORM_DEFAULTS.usdRate,
		workId: FORM_DEFAULTS.workId,
		pdf: null,
		created_at: FORM_DEFAULTS.created_at,
		usdQuote: FORM_DEFAULTS.usdQuote,
		date_of_sale: FORM_DEFAULTS.date_of_sale,
	});

	const [materials, setMaterials] = useState<Material[]>([]);

	const selectedWork = works.find((w) => String(w.id) === formData.workId);
	const selectedWorkLabel =
		formData.workId === 'none'
			? 'Sin obra'
			: selectedWork
				? selectedWork.name ||
					[selectedWork.address, selectedWork.locality].filter(Boolean).join(' - ') ||
					`Obra ${selectedWork.id}`
				: undefined;

	const resetForm = (data?: Partial<BudgetFormData>) => {
		setFormData({ ...FORM_DEFAULTS, ...data, pdf: data?.pdf ?? null });
	};

	// Reset form when modal opens or budget changes
	useEffect(() => {
		if (isOpen) {
			listMaterials()
				.then(({ data }) => {
					setMaterials(data ?? []);
				})
				.catch(() => {
					setMaterials([]);
				});
		}

		if (isOpen && mode === 'edit' && budget) {
			setFormData({
				type: budget.type || FORM_DEFAULTS.type,
				number: budget.number || FORM_DEFAULTS.number,
				amount: budget.amount_ars?.toLocaleString('es-AR') || FORM_DEFAULTS.amount,
				amountUsd: budget.amount_usd?.toString() || FORM_DEFAULTS.amountUsd,
				usdRate:
					budget.usd_quote?.toLocaleString('es-AR', {
						minimumFractionDigits: 0,
						maximumFractionDigits: 3,
					}) || '',
				workId: budget.folder_budget?.work_id
					? String(budget.folder_budget.work_id)
					: FORM_DEFAULTS.workId,
				pdf: null,
				created_at: budget.created_at
					? new Date(budget.created_at).toISOString().split('T')[0]
					: FORM_DEFAULTS.created_at,
				usdQuote: budget.usd_quote?.toString() || FORM_DEFAULTS.usdQuote,
				date_of_sale: budget.date_of_sale || FORM_DEFAULTS.date_of_sale,
			});
		} else if (isOpen) {
			resetForm();
		}
	}, [isOpen, mode, budget]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const dataToSend: BudgetFormData = {
			...formData,
			amount: parseArsToNumber(formData.amount).toString(),
			amountUsd: formData.amountUsd ? parseFloat(formData.amountUsd).toString() : '',
			usdRate: formData.usdRate ? parseArsToNumber(formData.usdRate).toString() : '',
		};
		await onSubmit(dataToSend);
	};

	const handleClose = () => {
		resetForm();
		onOpenChange(false);
	};

	useEffect(() => {
		if (formData.amount && formData.usdRate) {
			const normalizedAmount = formData.amount
				.replace(/\./g, '') // remove thousand separators
				.replace(',', '.'); // decimal separator to dot for parsing

			const normalizedRate = formData.usdRate
				.replace(/\./g, '') // remove thousand separators
				.replace(',', '.'); // decimal separator to dot for parsing

			const amountNumber = Number(normalizedAmount);
			const rateNumber = Number(normalizedRate);

			if (!isNaN(amountNumber) && !isNaN(rateNumber) && rateNumber !== 0) {
				const calculatedUsd = (amountNumber / rateNumber).toFixed(3);

				setFormData((prev) => ({
					...prev,
					amountUsd: calculatedUsd,
				}));
			}
		} else {
			setFormData((prev) => ({
				...prev,
				amountUsd: '',
			}));
		}
	}, [formData.usdRate, formData.amount]);

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{mode === 'edit' ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</DialogTitle>
					<DialogDescription>
						{mode === 'edit'
							? 'Modifica los detalles del presupuesto.'
							: 'Completa los campos para crear un nuevo presupuesto.'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid gap-2">
						<Label>Tipo de material</Label>
						<Select
							value={formData.type}
							onValueChange={(value) =>
								setFormData((prev: BudgetFormData) => ({ ...prev, type: value }))
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Seleccionar tipo" />
							</SelectTrigger>
							<SelectContent>
								{materials.length === 0 ? (
									<SelectItem value="no-materials" disabled>
										No hay materiales
									</SelectItem>
								) : (
									materials.map((m) => (
										<SelectItem key={m.id} value={m.name}>
											{m.name}
										</SelectItem>
									))
								)}
								<SelectItem value="Otros">Otros</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-2">
						<Label>Obra</Label>
						<Select
							value={formData.workId}
							onValueChange={(value) =>
								setFormData((prev: BudgetFormData) => ({ ...prev, workId: value }))
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Seleccionar obra">{selectedWorkLabel}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Sin obra</SelectItem>
								{works.map((w) => (
									<SelectItem key={w.id} value={String(w.id)}>
										{w.name ||
											[w.address, w.locality].filter(Boolean).join(' - ') ||
											`Obra ${w.id}`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid gap-2">
						<Label>Fecha de creación</Label>
						<Input
							type="date"
							value={formData.created_at}
							onChange={(e) =>
								setFormData((prev: BudgetFormData) => ({ ...prev, created_at: e.target.value }))
							}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label>Número de presupuesto</Label>
							<Input
								type="text"
								value={formData.number}
								onChange={(e) =>
									setFormData((prev: BudgetFormData) => ({ ...prev, number: e.target.value }))
								}
								placeholder="Ej: 123 o 1-2-A"
							/>
						</div>
						<div className="grid gap-2">
							<Label>Monto ARS</Label>
							<Input
								type="text"
								value={formData.amount}
								onChange={(e) => {
									const formatted = formatNumber(e.target.value);

									setFormData((prev: BudgetFormData) => ({
										...prev,
										amount: formatted,
									}));
								}}
								placeholder="0"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="usd-rate">Cotización del dólar</Label>
							<Input
								id="usd-rate"
								type="text"
								value={formData.usdRate}
								onChange={(e) => {
									const formatted = formatNumber(e.target.value);

									setFormData((prev: BudgetFormData) => ({
										...prev,
										usdRate: formatted,
									}));
								}}
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label>Monto USD</Label>
							<Input
								type="number"
								value={formData.amountUsd}
								onChange={(e) =>
									setFormData((prev: BudgetFormData) => ({ ...prev, amountUsd: e.target.value }))
								}
								placeholder="0"
							/>
						</div>
						<div className="flex items-start gap-1.5 col-span-2">
							<Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />

							<p className="text-xs text-muted-foreground">
								El formato USD usa punto en vez de coma para los decimales (ej: 1500.50)
							</p>
						</div>
					</div>

					<div className="grid gap-2">
						<Label>
							PDF {mode === 'edit' && '(Opcional - dejar vacío para mantener el actual)'}
						</Label>
						<Input
							type="file"
							accept="application/pdf"
							onChange={(e) =>
								setFormData((prev: BudgetFormData) => ({
									...prev,
									pdf: e.target.files?.[0] ?? null,
								}))
							}
						/>
					</div>

					<div className="flex justify-end gap-2 pt-4">
						<Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Procesando...' : mode === 'edit' ? 'Actualizar' : 'Crear'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
