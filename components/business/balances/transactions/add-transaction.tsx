import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Calendar as CalendarIcon, Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/formats-money';
import { BalanceTransaction } from '@/lib/balances/balance_transactions';
import { formatFileSize } from '@/utils/file-upload-utils';
import { PAYMENT_METHODS } from '@/constants/balances/payment_methods';
import { useCallback } from 'react';
import { BankAccount, listActiveBankAccounts } from '@/lib/cash-flow/cash-flow';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';

interface AddTransactionSectionProps {
	addingMode: 'transaction' | 'extra' | null;
	transactionDate: Date;
	onTransactionDateChange: (date: Date) => void;
	transactionAmount: string;
	onTransactionAmountChange: (value: string) => void;
	usdAmount: string;
	onUsdAmountChange: (value: string) => void;
	quoteUsd: string;
	onQuoteUsdChange: (value: string) => void;
	notes: string;
	onNotesChange: (value: string) => void;
	paymentMethod: string;
	onPaymentMethodChange: (value: string) => void;
	onBankAccountIdChange: (value: string) => void;
	bankAccountId: string;
	onCancel: () => void;
	onSave: () => void;
	onStartAddTransaction: () => void;
	onStartAddExtra: () => void;
	saveDisabled: boolean;
	editingTransaction?: BalanceTransaction;
	selectedFiles: File[];
	onFilesSelect: (files: File[]) => void;
	onRemoveFile: (index: number) => void;
}

export function AddTransactionSection({
	addingMode,
	transactionDate,
	onTransactionDateChange,
	transactionAmount,
	onTransactionAmountChange,
	usdAmount,
	onUsdAmountChange,
	quoteUsd,
	onQuoteUsdChange,
	notes,
	onNotesChange,
	paymentMethod,
	onPaymentMethodChange,
	onBankAccountIdChange,
	bankAccountId,
	onCancel,
	onSave,
	onStartAddTransaction,
	onStartAddExtra,
	saveDisabled,
	editingTransaction,
	selectedFiles,
	onFilesSelect,
	onRemoveFile,
}: AddTransactionSectionProps) {
	const isEditing = !!editingTransaction;

	const fetchActiveBankAccounts = useCallback(async () => {
		const { data } = await listActiveBankAccounts();
		return data ?? [];
	}, []);

	const {
		data: bankAccounts,
		loading: loadingBankAccounts,
		refresh: refreshBankAccounts,
	} = useOptimizedRealtime<BankAccount>(
		'bank_accounts',
		fetchActiveBankAccounts,
		'active_bank_accounts_cache'
	);

	if (!addingMode) {
		return (
			<div className="flex flex-col sm:flex-row gap-2 justify-center">
				<Button
					variant="outline"
					size="sm"
					className="w-60 items-center flex justify-center"
					onClick={onStartAddTransaction}
				>
					<Plus className="h-4 w-4 mr-2" />
					Agregar transacción
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="w-60 items-center flex justify-center"
					onClick={onStartAddExtra}
				>
					<Plus className="h-4 w-4 mr-2" />
					Agregar monto extra
				</Button>
			</div>
		);
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			const newFiles = Array.from(files);
			onFilesSelect(newFiles);
		}
		e.target.value = '';
	};

	return (
		<div className="space-y-4 p-4 border rounded-lg min-w-0 overflow-hidden">
			{' '}
			<h3 className="text-sm font-semibold">
				{isEditing
					? 'Editar transacción'
					: addingMode === 'extra'
						? 'Nuevo monto extra'
						: 'Nueva transacción'}
			</h3>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{' '}
				<div className="space-y-2">
					<Label htmlFor="transaction-date">Fecha</Label>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className={cn(
									'w-full justify-start text-left font-normal',
									!transactionDate && 'text-muted-foreground'
								)}
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{transactionDate
									? format(transactionDate, 'PPP', { locale: es })
									: 'Seleccionar fecha'}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={transactionDate}
								onSelect={(date) => date && onTransactionDateChange(date)}
								initialFocus
								locale={es}
							/>
						</PopoverContent>
					</Popover>
				</div>
				<div className="space-y-2">
					<Label htmlFor="transaction-amount">Monto en pesos</Label>
					<Input
						id="transaction-amount"
						type="text"
						value={transactionAmount}
						onChange={(e) => onTransactionAmountChange(formatNumber(e.target.value))}
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="quote-usd">Cotización USD</Label>
					<Input
						id="quote-usd"
						type="text"
						value={quoteUsd}
						onChange={(e) => onQuoteUsdChange(formatNumber(e.target.value))}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="usd-amount">Monto en USD</Label>
					<Input
						id="usd-amount"
						type="number"
						value={usdAmount}
						onChange={(e) => onUsdAmountChange(e.target.value)}
					/>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					{addingMode === 'transaction' && (
						<div className="space-y-2">
							<Label htmlFor="payment-method">Método de pago</Label>
							<Select value={paymentMethod} onValueChange={onPaymentMethodChange}>
								<SelectTrigger id="payment-method">
									<SelectValue placeholder="Seleccionar método" />
								</SelectTrigger>
								<SelectContent>
									{PAYMENT_METHODS.map((method) => (
										<SelectItem key={method.value} value={method.value}>
											{method.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}
				</div>
				{addingMode === 'transaction' && paymentMethod === 'bank_transfer' && (
					<div className="space-y-2">
						<Label htmlFor="bankAccount">Cuenta Bancaria</Label>
						<Select value={bankAccountId} onValueChange={onBankAccountIdChange}>
							<SelectTrigger>
								<SelectValue placeholder="Selecciona una cuenta" />
							</SelectTrigger>
							<SelectContent>
								{bankAccounts.map((account) => (
									<SelectItem key={account.id} value={String(account.id)}>
										{account.bank} - {account.name} ({account.account_number})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</div>
			<div className="space-y-2">
				<Label htmlFor="notes">Observaciones</Label>
				<Input
					id="notes"
					type="text"
					value={notes}
					onChange={(e) => onNotesChange(e.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Archivos adjuntos</Label>
				{selectedFiles.length > 0 && (
					<div className="space-y-1 mb-2">
						{selectedFiles.map((file, index) => (
							<div
								key={index}
								className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
							>
								<FileText className="h-4 w-4 text-muted-foreground shrink-0" />
								<span className="text-sm truncate flex-1">{file.name}</span>
								<span className="text-xs text-muted-foreground shrink-0">
									{formatFileSize(file.size)}
								</span>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0"
									onClick={() => onRemoveFile(index)}
									aria-label={`Eliminar ${file.name}`}
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						))}
					</div>
				)}
				<div className="flex items-center gap-2">
					<input
						type="file"
						id="transaction-file"
						className="hidden"
						multiple
						onChange={handleFileChange}
					/>
					<Button
						variant="outline"
						size="sm"
						type="button"
						onClick={() => document.getElementById('transaction-file')?.click()}
					>
						<Upload className="h-4 w-4 mr-2" />
						{selectedFiles.length > 0 ? 'Agregar más archivos' : 'Subir archivos'}
					</Button>
				</div>
			</div>
			<div className="flex gap-1 justify-end">
				<Button variant="outline" size="sm" onClick={onCancel}>
					Cancelar
				</Button>
				<Button size="sm" onClick={onSave} disabled={saveDisabled}>
					{isEditing ? 'Actualizar' : 'Guardar'}
				</Button>
			</div>
		</div>
	);
}
