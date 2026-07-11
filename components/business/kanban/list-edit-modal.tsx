import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2 } from 'lucide-react';
import type { List } from './types';

interface ListEditModalProps {
	list: List | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (name: string) => void;
}

export function ListEditModal({ list, open, onOpenChange, onSave }: ListEditModalProps) {
	const [name, setName] = useState('');

	useEffect(() => {
		if (list) {
			setName(list.name);
		}
	}, [list]);

	const handleSave = () => {
		if (name.trim()) {
			onSave(name.trim());
			onOpenChange(false);
		}
	};

	const handleCancel = () => {
		setName(list?.name || '');
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle asChild>
						<VisuallyHidden>Editar nombre de la lista</VisuallyHidden>
					</DialogTitle>
					<div className="flex items-center gap-2 mb-4">
						<Edit2 className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Editar nombre de la lista</h2>
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
