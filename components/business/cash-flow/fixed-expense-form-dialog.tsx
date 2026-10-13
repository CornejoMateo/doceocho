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
import { formatNumber } from '@/utils/formats-money';

type FixedExpenseFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingExpense: FixedExpenseWithCategory | null;
	activeCategories: CashFlowCategory[];
	categoryId: string;
	setCategoryId: (value: string) => void;
	description: string;
	setDescription: (value: string) => void;
	amount: string;
	setAmount: (value: string) => void;
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
	amount,
	setAmount,
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
					<div className="space-y-2">
						<Label htmlFor="fixed-expense-amount">Monto</Label>
						<Input
							id="fixed-expense-amount"
							type="text"
							placeholder="0,00"
							value={amount}
							onChange={(e) => setAmount(formatNumber(e.target.value))}
							required
						/>
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
