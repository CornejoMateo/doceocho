import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/clients/clients';
import { createClientFolder } from '@/lib/clients/clients';
import { useToast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { CONTACT_METHODS } from '@/constants/budgets/contact-methods';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { createClientAction } from '@/actions/clients/create-client';

interface ClientsAddDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onClientAdded?: () => void;
	clientToEdit?: {
		id: number | null;
		name: string | null;
		last_name: string | null;
		email?: string | null;
		phone_number?: string | null;
		locality?: string | null;
		contact_method?: string | null;
		referred_to?: string | null;
		identity_number?: string | null;
	};
	onUpdateClient?: (client: any) => Promise<void>;
}

export function ClientsAddDialog({
	open,
	onOpenChange,
	onClientAdded,
	clientToEdit,
	onUpdateClient,
}: ClientsAddDialogProps) {
	const { toast } = useToast();
	const [isLoading, setIsLoading] = useState(false);
	const [formData, setFormData] = useState({
		name: clientToEdit?.name || '',
		last_name: clientToEdit?.last_name || '',
		email: clientToEdit?.email || '',
		phone_number: clientToEdit?.phone_number || '',
		locality: clientToEdit?.locality || '',
		contact_method: clientToEdit?.contact_method || '',
		referred_to: clientToEdit?.referred_to || '',
		identity_number: clientToEdit?.identity_number || '',
	});

	useEffect(() => {
		if (open) {
			setFormData({
				name: clientToEdit?.name || '',
				last_name: clientToEdit?.last_name || '',
				email: clientToEdit?.email || '',
				phone_number: clientToEdit?.phone_number || '',
				locality: clientToEdit?.locality || '',
				contact_method: clientToEdit?.contact_method || '',
				referred_to: clientToEdit?.referred_to || '',
				identity_number: clientToEdit?.identity_number || '',
			});
		}
	}, [open]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { id, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[id === 'clientName'
				? 'name'
				: id === 'clientLastName'
					? 'last_name'
					: id === 'phone'
						? 'phone_number'
						: id === 'identityNumber'
							? 'identity_number'
							: id]: value,
		}));
	};

	const handleContactMethodChange = (value: string) => {
		setFormData((prev) => ({
			...prev,
			contact_method: value,
			referred_to: value === 'REFERIDO' ? prev.referred_to : '',
		}));
	};
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		try {
			const payload = {
				name: formData.name,
				last_name: formData.last_name,
				email: formData.email || null,
				phone_number: formData.phone_number || null,
				locality: formData.locality || null,
				contact_method: formData.contact_method || null,
				referred_to: formData.contact_method === 'REFERIDO' ? formData.referred_to || null : null,
				identity_number: formData.identity_number || null,
			};

			if (clientToEdit && onUpdateClient) {
				// Update existing client
				await onUpdateClient({
					...clientToEdit,
					...payload,
				});
				toast({
					title: 'Cliente actualizado',
					description: `${payload.name} ${payload.last_name} ha sido actualizado correctamente.`,
				});
				onOpenChange(false);
			} else {
				// Create new client
				console.log('Creating client with payload:', payload);
				const { data: client, error } = await createClientAction(payload);
				console.log('Create client result:', { client, error });
				if (error) throw error;

				if (client) {
					toast({
						title: 'Cliente creado',
						description: `${payload.name} ${payload.last_name} ha sido agregado correctamente.`,
					});
					onClientAdded?.();
					onOpenChange(false);
				}
			}
		} catch (error) {
			console.error('Error al procesar el cliente:', error);
			const message = translateError(error);
			toast({
				title: 'Error',
				description: message,
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="bg-card sm:max-w-2xl w-full overflow-y-auto max-h-[90dvh]">
				<DialogHeader>
					<DialogTitle className="text-foreground">
						{clientToEdit ? 'Editar cliente' : 'Registrar nuevo cliente'}
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						{clientToEdit
							? 'Actualice los datos del cliente'
							: 'Complete los datos del cliente para agregarlo al sistema'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="grid gap-4 py-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="clientLastName" className="text-foreground">
								Apellido
							</Label>
							<Input
								id="clientLastName"
								value={formData.last_name}
								onChange={handleInputChange}
								className="bg-background"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="clientName" className="text-foreground">
								Nombre
							</Label>
							<Input
								id="clientName"
								value={formData.name}
								onChange={handleInputChange}
								className="bg-background"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4">
						<div className="space-y-2">
							<Label htmlFor="identityNumber" className="text-foreground">
								DNI/CUIT
							</Label>
							<Input
								id="identityNumber"
								value={formData.identity_number}
								onChange={handleInputChange}
								className="bg-background"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="email" className="text-foreground">
								Email
							</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={handleInputChange}
								placeholder="cliente@email.com"
								className="bg-background"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="phone" className="text-foreground">
								Teléfono
							</Label>
							<Input
								id="phone"
								value={formData.phone_number}
								onChange={handleInputChange}
								className="bg-background"
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="locality" className="text-foreground">
								Localidad
							</Label>
							<Input
								id="locality"
								value={formData.locality}
								onChange={handleInputChange}
								className="bg-background"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="contact_method" className="text-foreground">
								Método de contacto
							</Label>
							<Select value={formData.contact_method} onValueChange={handleContactMethodChange}>
								<SelectTrigger className="bg-background">
									<SelectValue placeholder="Seleccionar método" />
								</SelectTrigger>
								<SelectContent>
									{CONTACT_METHODS.map((method) => (
										<SelectItem key={method.value} value={method.value}>
											{method.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					{formData.contact_method === 'REFERIDO' && (
						<div className="space-y-2">
							<Label htmlFor="referred_to" className="text-foreground">
								Referido por
							</Label>
							<Input
								id="referred_to"
								value={formData.referred_to}
								onChange={handleInputChange}
								className="bg-background"
								placeholder="Nombre de quien lo refirió"
							/>
						</div>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Guardando...' : clientToEdit ? 'Actualizar' : 'Crear'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
