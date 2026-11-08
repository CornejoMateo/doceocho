import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CashFlowCategory } from '@/lib/categories/categories';
import { FixedExpenseWithCategory } from '@/lib/fixed-expenses/fixed-expenses';
import { IVA_RATES } from '@/constants/cashflow/iva';
import { formatCurrency, formatNumber } from '@/utils/formats-money';

type FixedExpenseFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingExpense: FixedExpenseWithCategory | null;
	activeCategories: CashFlowCategory[];
	categoryId: string;
	setCategoryId: (value: string) => void;
	description: string;
	setDescription: (value: string) => void;
	netAmount: string;
	setNetAmount: (value: string) => void;
	ivaPercent: number;
	setIvaPercent: (value: number) => void;
	totalAmount: number;
	saving: boolean;
	onSubmit: (e: React.FormEvent) => void;
};

export function FixedExpenseFormDialog({
	open,
	onOpenChange,
	editingExpense,
	activeCategories,
	categoryId,
	setCategoryId,
	description,
	setDescription,
	netAmount,
	setNetAmount,
	ivaPercent,
	setIvaPercent,
	totalAmount,
	saving,
	onSubmit,
}: FixedExpenseFormDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{editingExpense ? 'Editar costo fijo' : 'Nuevo costo fijo'}</DialogTitle>
					<DialogDescription>
						{editingExpense
							? 'Modifica los datos del costo fijo'
							: 'Agrega un nuevo costo fijo mensual'}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={onSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="fixed-expense-category">Categoría</Label>
						<Select value={categoryId} onValueChange={setCategoryId} required>
							<SelectTrigger id="fixed-expense-category">
								<SelectValue placeholder="Selecciona una categoría" />
							</SelectTrigger>
							<SelectContent>
								{activeCategories.map((category) => (
									<SelectItem key={category.id} value={String(category.id)}>
										{category.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="fixed-expense-description">Concepto</Label>
						<Input
							id="fixed-expense-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={200}
							required
						/>
					</div>
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="fixed-expense-net-amount">Neto</Label>
							<Input
								id="fixed-expense-net-amount"
								type="text"
								placeholder="0,00"
								value={netAmount}
								onChange={(e) => {
									const formatted = formatNumber(e.target.value);
									const [intPart, decPart] = formatted.split(',');
									setNetAmount(
										decPart !== undefined ? `${intPart},${decPart.slice(0, 2)}` : formatted
									);
								}}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="fixed-expense-iva-percent">IVA %</Label>
							<Select value={String(ivaPercent)} onValueChange={(v) => setIvaPercent(Number(v))}>
								<SelectTrigger id="fixed-expense-iva-percent">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{IVA_RATES.map((rate) => (
										<SelectItem key={rate} value={String(rate)}>
											{rate}%
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Total</Label>
							<Input value={formatCurrency(totalAmount)} readOnly disabled />
						</div>
					</div>
					<div className="flex gap-2">
						<Button type="submit" disabled={saving} className="flex-1">
							{saving ? 'Guardando...' : editingExpense ? 'Actualizar' : 'Crear'}
						</Button>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
