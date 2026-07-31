'use client';

import { useEffect, useState } from 'react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { formatNumber, parseArsToNumber } from '@/utils/formats-money';

interface OpenCashBoxDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onOpenCashBox: (openingBalance: number) => Promise<void>;
}

export function OpenCashBoxDialog({ open, onOpenChange, onOpenCashBox }: OpenCashBoxDialogProps) {
	const [openingBalance, setOpeningBalance] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) {
			setOpeningBalance('');
		}
	}, [open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const balance = parseArsToNumber(openingBalance) || 0;

		setLoading(true);

		try {
			await onOpenCashBox(balance);
			onOpenChange(false);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Abrir caja</DialogTitle>
						<DialogDescription>
							Ingresá el saldo inicial con el que comenzará la caja.
						</DialogDescription>
					</DialogHeader>

					<div className="py-6 space-y-2">
						<Label htmlFor="openingBalance">Saldo inicial</Label>

						<Input
							id="openingBalance"
							value={openingBalance}
							onChange={(e) => setOpeningBalance(formatNumber(e.target.value))}
							autoFocus
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>

						<Button type="submit" disabled={loading}>
							{loading ? 'Abriendo...' : 'Abrir caja'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
