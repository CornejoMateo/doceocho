import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatNumber } from '@/utils/formats-money';
import type { PurchaseSupplierWithPayments } from '@/lib/suppliers/account-summary';
import {
	SupplierFileAttachments,
	type StagedFile,
} from '@/components/business/suppliers/supplier-file-attachments';

interface PurchaseFormProps {
	editingPurchase: PurchaseSupplierWithPayments | null;
	supplierName: string;
	purchaseAmount: string;
	onAmountChange: (value: string) => void;
	purchaseNotes: string;
	onNotesChange: (value: string) => void;
	isSubmitting: boolean;
	stagedFiles: StagedFile[];
	onStagedChange: (files: StagedFile[]) => void;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
}

export function PurchaseForm({
	editingPurchase,
	supplierName,
	purchaseAmount,
	onAmountChange,
	purchaseNotes,
	onNotesChange,
	isSubmitting,
	stagedFiles,
	onStagedChange,
	onSubmit,
	onCancel,
}: PurchaseFormProps) {
	return (
		<>
			<DialogHeader>
				<DialogTitle>{editingPurchase ? 'Editar compra' : 'Nueva compra'}</DialogTitle>
				<DialogDescription>
					{editingPurchase
						? 'Modifica los datos de la compra'
						: `Registra una nueva compra para ${supplierName}`}
				</DialogDescription>
			</DialogHeader>
			<form onSubmit={onSubmit} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="purchase-amount">Monto</Label>
					<Input
						id="purchase-amount"
						type="text"
						placeholder="0,00"
						value={purchaseAmount}
						onChange={(e) => onAmountChange(formatNumber(e.target.value))}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="purchase-notes">Notas (opcional)</Label>
					<Textarea
						id="purchase-notes"
						value={purchaseNotes}
						onChange={(e) => onNotesChange(e.target.value)}
						maxLength={2000}
					/>
				</div>

				<SupplierFileAttachments
					kind="purchase"
					entityId={editingPurchase?.id}
					staged={stagedFiles}
					onStagedChange={onStagedChange}
				/>

				<div className="flex gap-2">
					<Button type="submit" disabled={isSubmitting} className="flex-1">
						{isSubmitting ? 'Guardando...' : editingPurchase ? 'Actualizar' : 'Crear'}
					</Button>
					<Button type="button" variant="outline" onClick={onCancel}>
						{editingPurchase ? 'Volver' : 'Cancelar'}
					</Button>
				</div>
			</form>
		</>
	);
}
