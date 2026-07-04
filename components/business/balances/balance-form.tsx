'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NotesInput } from '@/components/ui/notes-input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Balance, BudgetWithWork } from '@/lib/balances/balances';
import { useState, useMemo, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatNumber, parseArsToNumber } from '@/utils/formats-money';

interface BalanceFormProps {
	clientId: number;
	budgets: BudgetWithWork[];
	onSubmit: (balance: Omit<Balance, 'id' | 'created_at'>) => Promise<void>;
	onCancel: () => void;
}

interface BalanceFormData {
	contract_date_usd: string;
	start_date?: string | Date;
	usd_current: string;
	notes: string | null;
	balance_amount_usd: string;
	balance_amount_ars: string;
}

export function BalanceForm({ clientId, budgets, onSubmit, onCancel }: BalanceFormProps) {
	const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const [isAutoCalculating, setIsAutoCalculating] = useState(true);
	const [formData, setFormData] = useState<BalanceFormData>({
		contract_date_usd: '',
		start_date: new Date(),
		usd_current: '',
		notes: null,
		balance_amount_usd: '',
		balance_amount_ars: '',
	});

	const budgetsAccepted = useMemo(() => {
		return budgets.filter((b) => b.accepted || b.sold);
	}, [budgets]);

	const handleBudgetChange = (budgetId: string) => {
		setSelectedBudgetId(budgetId);

		const selectedBudget = budgetsAccepted.find((b) => String(b.id) === budgetId);

		if (!selectedBudget) return;

		setIsAutoCalculating(false);

		setFormData((prev) => ({
			...prev,
			balance_amount_ars: selectedBudget.amount_ars?.toLocaleString('es-AR') || '',
			balance_amount_usd: selectedBudget.amount_usd?.toString() || '',
			usd_current: selectedBudget.usd_quote
				? formatNumber(selectedBudget.usd_quote.toLocaleString('es-AR'))
				: '',
			contract_date_usd: selectedBudget.usd_quote
				? formatNumber(selectedBudget.usd_quote.toLocaleString('es-AR'))
				: '',
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const balanceData: Omit<Balance, 'id' | 'created_at'> = {
			client_id: clientId,
			budget_id: selectedBudgetId ? Number(selectedBudgetId) : null,
			start_date: formData.start_date
				? format(formData.start_date as Date, 'yyyy-MM-dd')
				: undefined,
			contract_date_usd: formData.contract_date_usd
				? parseArsToNumber(formData.contract_date_usd)
				: null,
			usd_current: formData.usd_current ? parseArsToNumber(formData.usd_current) : null,
			notes: formData.notes && formData.notes.length > 0 ? formData.notes : null,
			balance_amount_usd: formData.balance_amount_usd
				? parseFloat(formData.balance_amount_usd)
				: null,
			balance_amount_ars: formData.balance_amount_ars
				? parseArsToNumber(formData.balance_amount_ars)
				: null,
		};

		await onSubmit(balanceData);
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;

		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	useEffect(() => {
		if (!isAutoCalculating) return;
		if (formData.balance_amount_ars && formData.usd_current) {
			const normalizedAmount = formData.balance_amount_ars
				.replace(/\./g, '') // remove thousand separators
				.replace(',', '.'); // decimal separator to dot for parsing

			const amountNumber = Number(normalizedAmount);
			const rateNumber = parseArsToNumber(formData.usd_current);

			if (!isNaN(amountNumber) && !isNaN(rateNumber)) {
				const calculatedUsd = (amountNumber / rateNumber).toFixed(3);

				setFormData((prev) => ({
					...prev,
					balance_amount_usd: calculatedUsd,
				}));
			}
		}
	}, [formData.usd_current, formData.balance_amount_ars, isAutoCalculating]);

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="budget">Presupuesto asociado</Label>
					<Select value={selectedBudgetId} onValueChange={handleBudgetChange}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Seleccionar presupuesto" />
						</SelectTrigger>

						<SelectContent>
							{budgetsAccepted.map((budget) => {
								const work = budget.folder_budget?.work;
								const locality = work?.locality || 'Sin localidad';
								const address = work?.address || 'Sin dirección';
								const budgetNumber = budget.number || 'Sin número';
								const budgetType = budget.type || 'Sin tipo';
								return (
									<SelectItem key={budget.id} value={String(budget.id)}>
										{locality} - {address} - {budgetNumber} - {budgetType} ($
										{budget.amount_ars.toLocaleString('es-AR')})
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2 md:col-span-2">
					<Label>Fecha de inicio</Label>
					<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className={cn(
									'w-full',
									'text-left font-normal',
									!formData.start_date && 'text-muted-foreground'
								)}
							>
								{formData.start_date ? (
									format(formData.start_date, 'PPP', { locale: es })
								) : (
									<span>Seleccionar fecha</span>
								)}
								<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={
									formData.start_date?.toString() ? new Date(formData.start_date) : undefined
								}
								onSelect={(date) => {
									setFormData((prev) => ({ ...prev, start_date: date?.toString() || undefined }));
									setIsCalendarOpen(false);
								}}
								locale={es}
							/>
						</PopoverContent>
					</Popover>
				</div>

				<div className="space-y-2">
					<Label htmlFor="contract_date_usd">USD en fecha de contratación</Label>
					<Input
						id="contract_date_usd"
						name="contract_date_usd"
						type="text"
						step="0.01"
						value={formData.contract_date_usd || ''}
						onChange={(e) => {
							const formatted = formatNumber(e.target.value);
							setFormData((prev) => ({
								...prev,
								contract_date_usd: formatted,
							}));
						}}
						placeholder="0.00"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="usd_current">Valor dólar actual</Label>
					<Input
						id="usd_current"
						name="usd_current"
						type="text"
						step="0.01"
						value={formData.usd_current || ''}
						onChange={(e) => {
							const formatted = formatNumber(e.target.value);
							setIsAutoCalculating(true);
							setFormData((prev) => ({
								...prev,
								usd_current: formatted,
							}));
						}}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="balance_amount_ars">Monto del saldo en ARS</Label>
					<Input
						id="balance_amount_ars"
						name="balance_amount_ars"
						type="text"
						value={formData.balance_amount_ars || ''}
						onChange={(e) => {
							setIsAutoCalculating(true);
							const formatted = formatNumber(e.target.value);
							setFormData((prev) => ({
								...prev,
								balance_amount_ars: formatted,
							}));
						}}
						placeholder="0"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="balance_amount_usd">Monto del saldo en USD</Label>
					<Input
						id="balance_amount_usd"
						name="balance_amount_usd"
						type="number"
						step="0.01"
						value={formData.balance_amount_usd || ''}
						onChange={handleChange}
						placeholder="0.00"
					/>
				</div>
			</div>

			<NotesInput
				value={formData.notes || ''}
				onChange={(value) => setFormData((prev) => ({ ...prev, notes: value ? value : null }))}
				placeholder="Agregar notas sobre este saldo (opcional)"
				rows={3}
			/>

			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="submit">Crear saldo</Button>
			</div>
		</form>
	);
}
