'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Work } from '@/lib/works/works';
import { useState } from 'react';

interface WorkFormProps {
	clientId: number;
	onSubmit: (work: Omit<Work, 'id' | 'created_at' | 'client_id'>) => Promise<void>;
	onCancel: () => void;
}

export function WorkForm({ onSubmit, onCancel }: WorkFormProps) {
	const [formData, setFormData] = useState<Omit<Work, 'id' | 'created_at' | 'client_id'>>({
		locality: '',
		address: '',
		status: 'pending',
		architect: '',
		furniture: '',
		zone: '',
		hood: '',
		name: '',
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit(formData);
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2 col-span-2 md:col-span-2">
					<Label htmlFor="name">Nombre de la obra</Label>
					<Input id="name" name="name" value={formData.name || ''} onChange={handleChange} />
				</div>

				<div className="space-y-2">
					<Label htmlFor="locality">Localidad</Label>
					<Input
						id="locality"
						name="locality"
						value={formData.locality || ''}
						onChange={handleChange}
						placeholder="Ej: Córdoba Capital"
						required
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="zone">Zona</Label>
					<Input
						id="zone"
						name="zone"
						value={formData.zone || ''}
						onChange={handleChange}
						placeholder="Ej: Zona Norte"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="hood">Barrio</Label>
					<Input
						id="hood"
						name="hood"
						value={formData.hood || ''}
						onChange={handleChange}
						placeholder="Ej: Centro"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="address">Dirección</Label>
					<Input
						id="address"
						name="address"
						value={formData.address || ''}
						onChange={handleChange}
						placeholder="Ej: Av. Colón 1234"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="furniture">Mobiliario</Label>
					<Input
						id="furniture"
						name="furniture"
						value={formData.furniture || ''}
						onChange={handleChange}
						placeholder="Descripción del mobiliario"
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="architect">Arquitecto</Label>
					<Input
						id="architect"
						name="architect"
						value={formData.architect || ''}
						onChange={handleChange}
						placeholder="Nombre del arquitecto"
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="status">Estado</Label>
				<Select
					name="status"
					value={formData.status || 'pending'}
					onValueChange={(value) =>
						setFormData((prev) => ({
							...prev,
							status: value as 'pending' | 'in_progress' | 'completed',
						}))
					}
					required
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Seleccionar estado" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="pending">Pendiente</SelectItem>
						<SelectItem value="in_progress">En progreso</SelectItem>
						<SelectItem value="completed">Finalizada</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex justify-end space-x-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="submit">Guardar Obra</Button>
			</div>
		</form>
	);
}
