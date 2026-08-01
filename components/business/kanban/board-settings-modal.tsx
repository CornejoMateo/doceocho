import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Clock, AlertTriangle } from 'lucide-react';
import type { Board } from './types';

interface BoardSettingsModalProps {
	board: Board | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (
		changes: Partial<Pick<Board, 'due_date_tolerance_yellow' | 'due_date_tolerance_red'>>
	) => void;
}

export function BoardSettingsModal({ board, open, onOpenChange, onSave }: BoardSettingsModalProps) {
	const [yellowTolerance, setYellowTolerance] = useState(board?.due_date_tolerance_yellow ?? 2);
	const [redTolerance, setRedTolerance] = useState(board?.due_date_tolerance_red ?? 0);

	const handleSave = () => {
		onSave({
			due_date_tolerance_yellow: yellowTolerance,
			due_date_tolerance_red: redTolerance,
		});
		onOpenChange(false);
	};

	const handleCancel = () => {
		setYellowTolerance(board?.due_date_tolerance_yellow ?? 2);
		setRedTolerance(board?.due_date_tolerance_red ?? 0);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md" aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle asChild>
						<VisuallyHidden>Configuración del tablero</VisuallyHidden>
					</DialogTitle>
					<div className="flex items-center gap-2 mb-4">
						<Settings className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Configuración del tablero</h2>
					</div>
				</DialogHeader>

				<div className="space-y-6">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-yellow-500" />
							<Label htmlFor="yellow-tolerance" className="font-medium">
								Alerta Amarilla
							</Label>
						</div>
						<p className="text-sm text-muted-foreground">
							Días antes de la fecha límite para mostrar alerta amarilla
						</p>
						<Input
							id="yellow-tolerance"
							type="number"
							min="0"
							value={yellowTolerance}
							onChange={(e) => setYellowTolerance(parseInt(e.target.value, 10) || 0)}
							className="w-full"
						/>
					</div>

					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4 text-red-500" />
							<Label htmlFor="red-tolerance" className="font-medium">
								Alerta Roja
							</Label>
						</div>
						<p className="text-sm text-muted-foreground">
							Días antes de la fecha límite para mostrar alerta roja
						</p>
						<Input
							id="red-tolerance"
							type="number"
							min="0"
							value={redTolerance}
							onChange={(e) => setRedTolerance(parseInt(e.target.value, 10) || 0)}
							className="w-full"
						/>
					</div>

					<div className="bg-muted/50 p-3 rounded-lg">
						<div className="flex items-start gap-2">
							<Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
							<p className="text-xs text-muted-foreground">
								La alerta roja tiene prioridad sobre la amarilla. Si ambas tolerancias son iguales,
								solo se mostrará la alerta roja.
							</p>
						</div>
					</div>
				</div>

				<div className="flex gap-2 justify-end mt-6">
					<Button variant="outline" onClick={handleCancel}>
						Cancelar
					</Button>
					<Button onClick={handleSave}>Guardar</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
