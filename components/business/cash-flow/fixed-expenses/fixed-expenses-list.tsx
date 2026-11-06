import { EditOnly } from '@/components/permissions/edit-scope';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Ban, RotateCcw, Receipt } from 'lucide-react';
import { FixedExpenseWithCategory, hasExpenseThisMonth } from '@/lib/fixed-expenses/fixed-expenses';
import { formatCurrency } from '@/utils/formats-money';

type FixedExpensesListProps = {
	expenses: FixedExpenseWithCategory[];
	loading: boolean;
	showInactive: boolean;
	onShowInactiveChange: (checked: boolean) => void;
	onAdd: () => void;
	onEdit: (expense: FixedExpenseWithCategory) => void;
	onDeactivate: (expense: FixedExpenseWithCategory) => void;
	onReactivate: (expense: FixedExpenseWithCategory) => void;
	onAddExpense: (expense: FixedExpenseWithCategory) => void;
	actionLoading: boolean;
};

export function FixedExpensesList({
	expenses,
	loading,
	showInactive,
	onShowInactiveChange,
	onAdd,
	onEdit,
	onDeactivate,
	onReactivate,
	onAddExpense,
	actionLoading,
}: FixedExpensesListProps) {
	const renderActions = (expense: FixedExpenseWithCategory, withLabel: boolean) => {
		const size = withLabel ? 'default' : 'sm';
		const buttonClass = withLabel ? 'flex-1 gap-2' : '';
		const addExpenseLabel = hasExpenseThisMonth(expense) ? 'Agregar de nuevo' : 'Agregar Gasto';
		return (
			<>
				{expense.is_active && (
					<EditOnly edit="cash-flow">
						<Button
							variant={withLabel ? 'outline' : 'ghost'}
							size={size}
							aria-label={addExpenseLabel}
							title={addExpenseLabel}
							className={buttonClass}
							onClick={() => onAddExpense(expense)}
							disabled={actionLoading}
						>
							<Receipt className="h-4 w-4" />
							{withLabel && addExpenseLabel}
						</Button>
					</EditOnly>
				)}
				<EditOnly edit="cash-flow">
					<Button
						variant={withLabel ? 'outline' : 'ghost'}
						size={size}
						aria-label="Editar"
						title="Editar"
						className={buttonClass}
						onClick={() => onEdit(expense)}
						disabled={actionLoading}
					>
						<Edit className="h-4 w-4" />
						{withLabel && 'Editar'}
					</Button>
				</EditOnly>
				{expense.is_active ? (
					<EditOnly edit="cash-flow">
						<Button
							variant={withLabel ? 'outline' : 'ghost'}
							size={size}
							aria-label="Desactivar"
							title="Desactivar"
							className={`text-destructive ${buttonClass}`}
							onClick={() => onDeactivate(expense)}
							disabled={actionLoading}
						>
							<Ban className="h-4 w-4" />
							{withLabel && 'Desactivar'}
						</Button>
					</EditOnly>
				) : (
					<EditOnly edit="cash-flow">
						<Button
							variant={withLabel ? 'outline' : 'ghost'}
							size={size}
							aria-label="Reactivar"
							title="Reactivar"
							className={buttonClass}
							onClick={() => onReactivate(expense)}
							disabled={actionLoading}
						>
							<RotateCcw className="h-4 w-4" />
							{withLabel && 'Reactivar'}
						</Button>
					</EditOnly>
				)}
			</>
		);
	};

	return (
		<div className="space-y-4 min-w-0">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-2">
					<Switch
						id="show-inactive-fixed-expenses"
						checked={showInactive}
						onCheckedChange={onShowInactiveChange}
					/>
					<Label htmlFor="show-inactive-fixed-expenses">Mostrar inactivas</Label>
				</div>
				<EditOnly edit="cash-flow">
					<Button onClick={onAdd} className="gap-2">
						<Plus className="h-4 w-4" />
						Nuevo costo fijo
					</Button>
				</EditOnly>
			</div>

			{loading ? (
				<Card className="bg-card border-border p-8 text-center text-muted-foreground">
					Cargando...
				</Card>
			) : expenses.length === 0 ? (
				<Card className="bg-card border-border p-8 text-center text-muted-foreground">
					No hay costos fijos registrados
				</Card>
			) : (
				<>
					<div className="hidden md:block" data-testid="fixed-expenses-desktop">
						<Card className="bg-card border-border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="text-center">Concepto</TableHead>
										<TableHead className="text-center">Categoría</TableHead>
										<TableHead className="text-center">Monto</TableHead>
										<TableHead className="text-center">Estado</TableHead>
										<TableHead className="text-center">Acciones</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{expenses.map((expense) => (
										<TableRow key={expense.id}>
											<TableCell className="font-medium text-center">
												<div className="flex items-center justify-center gap-2">
													<span>{expense.description}</span>
													{expense.is_active && hasExpenseThisMonth(expense) && (
														<Badge variant="secondary">Gasto creado</Badge>
													)}
												</div>
											</TableCell>
											<TableCell className="text-center">{expense.category_name}</TableCell>
											<TableCell className="text-center">
												{formatCurrency(expense.amount)}
												<div className="text-xs text-muted-foreground">
													IVA {formatCurrency(expense.iva_amount)}
												</div>
											</TableCell>
											<TableCell className="text-center">
												<Badge variant={expense.is_active ? 'default' : 'outline'}>
													{expense.is_active ? 'Activo' : 'Inactivo'}
												</Badge>
											</TableCell>
											<TableCell className="text-center">
												<div className="flex justify-center gap-2">
													{renderActions(expense, false)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					</div>

					<div className="md:hidden space-y-3" data-testid="fixed-expenses-mobile">
						{expenses.map((expense) => (
							<Card
								key={expense.id}
								className={`bg-card border-border p-4 space-y-3 ${expense.is_active ? '' : 'opacity-60 bg-muted'}`}
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium min-w-0 break-words">{expense.description}</span>
									<div className="flex items-center gap-2">
										{expense.is_active && hasExpenseThisMonth(expense) && (
											<Badge variant="secondary">Gasto creado</Badge>
										)}
										<Badge variant={expense.is_active ? 'default' : 'outline'}>
											{expense.is_active ? 'Activo' : 'Inactivo'}
										</Badge>
									</div>
								</div>
								<dl className="space-y-1 text-sm">
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Categoría</dt>
										<dd>{expense.category_name}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-muted-foreground">Monto</dt>
										<dd>
											{formatCurrency(expense.amount)}
											<div className="text-xs text-muted-foreground">
												IVA {formatCurrency(expense.iva_amount)}
											</div>
										</dd>
									</div>
								</dl>
								<div className="flex gap-2 pt-1">{renderActions(expense, true)}</div>
							</Card>
						))}
					</div>
				</>
			)}
		</div>
	);
}
