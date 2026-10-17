'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface SettledReminderModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isConfirming?: boolean;
}

export function SettledReminderModal({
	isOpen,
	onOpenChange,
	onConfirm,
	isConfirming = false,
}: SettledReminderModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CheckCircle2 className="h-5 w-5 text-green-600" />
						Cuenta corriente en $0
					</DialogTitle>
					<DialogDescription>
						Este saldo llegó a $0. ¿Querés marcarlo como saldado?
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
						Ahora no
					</Button>
					<Button onClick={onConfirm} disabled={isConfirming}>
						{isConfirming ? 'Guardando...' : 'Marcar como saldado'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
