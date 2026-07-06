import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Palette } from 'lucide-react';
import type { BoardFormData } from './types';

interface BoardCreationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (board: BoardFormData) => void;
}

const BOARD_COLORS = [
	'#4F5C4D', // Default green
	'#3B82F6', // Blue
	'#EF4444', // Red
	'#F59E0B', // Orange
	'#8B5CF6', // Purple
	'#EC4899', // Pink
	'#10B981', // Emerald
	'#6366F1', // Indigo
];

export function BoardCreationModal({ open, onOpenChange, onCreate }: BoardCreationModalProps) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [selectedColor, setSelectedColor] = useState(BOARD_COLORS[0]);

	const handleCreate = () => {
		if (!name.trim()) return;
		onCreate({
			name: name.trim(),
			description: description.trim() || undefined,
			color: selectedColor,
		});
		handleClose();
	};

	const handleClose = () => {
		setName('');
		setDescription('');
		setSelectedColor(BOARD_COLORS[0]);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle asChild>
						<VisuallyHidden>Crear nuevo tablero</VisuallyHidden>
					</DialogTitle>
					<div className="flex items-center gap-2 mb-4">
						<Plus className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Crear nuevo tablero</h2>
					</div>
				</DialogHeader>

				<div className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="board-name" className="font-medium">
							Nombre del tablero
						</Label>
						<Input
							id="board-name"
							placeholder="Ej: Proyecto Marketing"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full"
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="board-description" className="font-medium">
							Descripción (opcional)
						</Label>
						<Textarea
							id="board-description"
							placeholder="Describe el propósito de este tablero..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full resize-none"
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Palette className="h-4 w-4" />
							<Label className="font-medium">Color del tablero</Label>
						</div>
						<div className="flex gap-2 flex-wrap">
							{BOARD_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									onClick={() => setSelectedColor(color)}
									className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
										selectedColor === color
											? 'border-primary scale-110 ring-2 ring-primary/20'
											: 'border-transparent'
									}`}
									style={{ backgroundColor: color }}
									title={color}
								/>
							))}
						</div>
					</div>

					<div className="bg-muted/50 p-4 rounded-lg">
						<div
							className="h-16 rounded-lg flex items-center justify-center text-white font-semibold"
							style={{ backgroundColor: selectedColor }}
						>
							{name || 'Nombre del tablero'}
						</div>
					</div>
				</div>

				<div className="flex gap-2 justify-end mt-6">
					<Button variant="outline" onClick={handleClose}>
						Cancelar
					</Button>
					<Button onClick={handleCreate} disabled={!name.trim()}>
						Crear tablero
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
