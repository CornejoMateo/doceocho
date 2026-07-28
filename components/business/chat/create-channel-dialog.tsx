'use client';

import { useState } from 'react';
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
import { createChannelAction } from '@/lib/chat/channels';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';

interface CreateChannelDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChannelCreated: () => void;
}

export function CreateChannelDialog({
	open,
	onOpenChange,
	onChannelCreated,
}: CreateChannelDialogProps) {
	const { user } = useAuth();
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user) return;

		setLoading(true);
		setError('');

		const result = await createChannelAction(name, description);

		if (!result.error) {
			setName('');
			setDescription('');
			onChannelCreated();
		} else {
			setError(result.error || 'Error al crear el canal');
			toast({ title: 'Error al crear canal', description: result.error, variant: 'destructive' });
		}

		setLoading(false);
	};

	const handleClose = () => {
		setName('');
		setDescription('');
		setError('');
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Crear nuevo canal</DialogTitle>
					<DialogDescription>Crea un nuevo canal de comunicación para el equipo.</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Nombre del canal *</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Ej: Equipo de Ventas"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Descripción</Label>
							<Textarea
								id="description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Descripción del canal (opcional)"
								rows={3}
							/>
						</div>
						{error && <div className="text-sm text-destructive">{error}</div>}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							Cancelar
						</Button>
						<Button type="submit" disabled={loading || !name.trim()}>
							{loading ? 'Creando...' : 'Crear canal'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
