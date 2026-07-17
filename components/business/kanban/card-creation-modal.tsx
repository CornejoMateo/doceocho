import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface CardCreationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (title: string) => void;
}

export function CardCreationModal({ open, onOpenChange, onCreate }: CardCreationModalProps) {
	const [title, setTitle] = useState('');

	const handleCreate = () => {
		if (title.trim()) {
			onCreate(title.trim());
			setTitle('');
			onOpenChange(false);
		}
	};

	const handleClose = () => {
		setTitle('');
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle asChild>
						<VisuallyHidden>Crear nueva tarjeta</VisuallyHidden>
					</DialogTitle>
					<div className="flex items-center gap-2 mb-4">
						<Plus className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Crear nueva tarjeta</h2>
					</div>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="card-title">Título de la tarjeta</Label>
						<Input
							id="card-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Ej: Revisar documentación"
							autoFocus
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									handleCreate();
								}
							}}
						/>
					</div>
				</div>

				<div className="flex gap-2 justify-end mt-6">
					<Button variant="outline" onClick={handleClose}>
						Cancelar
					</Button>
					<Button onClick={handleCreate} disabled={!title.trim()}>
						Crear tarjeta
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
