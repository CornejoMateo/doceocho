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
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BOARD_COLORS } from '@/constants/kanban/board-creation-modal';
import type { Board } from './types';

export type BoardSettingsChanges = Partial<
	Pick<
		Board,
		'name' | 'description' | 'color' | 'due_date_tolerance_yellow' | 'due_date_tolerance_red'
	>
>;

interface BoardSettingsModalProps {
	board: Board | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (changes: BoardSettingsChanges) => void;
}

/**
 * Everything about a board in one place.
 * Name, description and colour used to live in a separate modal reachable only
 * from the boards list, while the due date alerts lived inside the board.
 */
export function BoardSettingsModal({ board, open, onOpenChange, onSave }: BoardSettingsModalProps) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [color, setColor] = useState<string>(BOARD_COLORS[0]);
	const [yellowTolerance, setYellowTolerance] = useState('2');
	const [redTolerance, setRedTolerance] = useState('0');

	useEffect(() => {
		if (!open || !board) return;

		setName(board.name);
		setDescription(board.description ?? '');
		setColor(board.color || BOARD_COLORS[0]);
		setYellowTolerance(String(board.due_date_tolerance_yellow ?? 2));
		setRedTolerance(String(board.due_date_tolerance_red ?? 0));
	}, [open, board]);

	const handleSave = () => {
		if (!name.trim()) return;

		onSave({
			name: name.trim(),
			description: description.trim() || null,
			color,
			due_date_tolerance_yellow: Number(yellowTolerance) || 0,
			due_date_tolerance_red: Number(redTolerance) || 0,
		});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-lg max-h-[95dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Configuración del tablero</DialogTitle>
					<DialogDescription>
						Cambiá el nombre, el color y cuándo querés que te avise por las fechas límite.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					<div className="grid gap-2">
						<Label htmlFor="board-name">Nombre</Label>
						<Input
							id="board-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Ej: Producción taller"
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="board-description">Descripción (opcional)</Label>
						<Textarea
							id="board-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="Para qué sirve este tablero..."
							rows={2}
						/>
					</div>

					<div className="grid gap-2">
						<Label>Color</Label>
						<div className="flex flex-wrap gap-2">
							{BOARD_COLORS.map((boardColor) => (
								<button
									key={boardColor}
									type="button"
									onClick={() => setColor(boardColor)}
									className={cn(
										'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
										color === boardColor ? 'border-foreground' : 'border-transparent'
									)}
									style={{ backgroundColor: boardColor }}
									aria-label={`Color ${boardColor}`}
									aria-pressed={color === boardColor}
								/>
							))}
						</div>
					</div>

					<div className="space-y-3 rounded-lg border border-border p-3">
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<h4 className="text-sm font-medium text-foreground">Avisos por fecha límite</h4>
						</div>
						<p className="text-xs text-muted-foreground">
							Las tarjetas con fecha límite cambian de color cuando se acerca el vencimiento.
						</p>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="yellow-tolerance" className="flex items-center gap-1.5 text-xs">
									<AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
									Pasa a amarillo
								</Label>
								<Input
									id="yellow-tolerance"
									type="number"
									min={0}
									value={yellowTolerance}
									onChange={(event) => setYellowTolerance(event.target.value)}
								/>
								<span className="text-xs text-muted-foreground">días antes</span>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="red-tolerance" className="flex items-center gap-1.5 text-xs">
									<AlertTriangle className="h-3.5 w-3.5 text-red-500" />
									Pasa a rojo
								</Label>
								<Input
									id="red-tolerance"
									type="number"
									min={0}
									value={redTolerance}
									onChange={(event) => setRedTolerance(event.target.value)}
								/>
								<span className="text-xs text-muted-foreground">días antes</span>
							</div>
						</div>

						<p className="text-xs text-muted-foreground">
							El rojo tiene prioridad sobre el amarillo. Si ponés el mismo número en los dos, solo
							vas a ver el rojo.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button onClick={handleSave} disabled={!name.trim()}>
						Guardar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
