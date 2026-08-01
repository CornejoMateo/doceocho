import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface ListCreationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (name: string) => void;
}

export function ListCreationModal({ open, onOpenChange, onCreate }: ListCreationModalProps) {
	const [name, setName] = useState('');

	const handleCreate = () => {
		if (name.trim()) {
			onCreate(name.trim());
			setName('');
			onOpenChange(false);
		}
	};

	const handleClose = () => {
		setName('');
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md" aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle asChild>
						<VisuallyHidden>Crear nueva lista</VisuallyHidden>
					</DialogTitle>
					<div className="flex items-center gap-2 mb-4">
						<Plus className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Crear nueva lista</h2>
					</div>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="list-name">Nombre de la lista</Label>
						<Input
							id="list-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ej: Por hacer"
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
					<Button onClick={handleCreate} disabled={!name.trim()}>
						Crear Lista
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
