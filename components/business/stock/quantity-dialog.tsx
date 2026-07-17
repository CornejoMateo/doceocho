import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface QuantityDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	dialogType: 'increase' | 'decrease' | null;
	quantityChange: number | '';
	setQuantityChange: (value: number | '') => void;
	onConfirm: () => void;
}

export function QuantityDialog({
	open,
	onOpenChange,
	dialogType,
	quantityChange,
	setQuantityChange,
	onConfirm,
}: QuantityDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{dialogType === 'increase' ? 'Aumentar cantidad' : 'Disminuir cantidad'}
					</DialogTitle>
					<DialogDescription>
						{dialogType === 'increase'
							? '¿Cuántas unidades desea aumentar?'
							: '¿Cuántas unidades desea disminuir?'}
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Input
						type="number"
						value={quantityChange}
						onChange={(e) => setQuantityChange(e.target.value ? Number(e.target.value) : '')}
						placeholder="Ingrese la cantidad"
						min="0"
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button onClick={onConfirm}>
						{dialogType === 'increase' ? 'Aumentar' : 'Disminuir'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
