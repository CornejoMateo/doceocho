import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2 } from 'lucide-react';
import type { Board } from './types';

interface BoardEditModalProps {
	board: Board | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (name: string) => void;
}

export function BoardEditModal({ board, open, onOpenChange, onSave }: BoardEditModalProps) {
	const [name, setName] = useState('');

	useEffect(() => {
		if (board) {
			setName(board.name);
		}
	}, [board]);

	const handleSave = () => {
		if (name.trim()) {
			onSave(name.trim());
			onOpenChange(false);
		}
	};

	const handleCancel = () => {
		setName(board?.name || '');
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle asChild>
						<VisuallyHidden>Editar nombre del tablero</VisuallyHidden>
					</DialogTitle>
					<div className="flex items-center gap-2 mb-4">
						<Edit2 className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Editar nombre del tablero</h2>
					</div>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="board-name">Nombre del tablero</Label>
						<Input
							id="board-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ej: Proyecto Marketing"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleSave();
								}
							}}
						/>
					</div>
				</div>

				<div className="flex gap-2 justify-end mt-6">
					<Button variant="outline" onClick={handleCancel}>
						Cancelar
					</Button>
					<Button onClick={handleSave} disabled={!name.trim()}>
						Guardar
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
