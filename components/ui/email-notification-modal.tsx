'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, MapPin, Clock, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from './use-toast';
import { translateError } from '@/lib/error-translator';

interface Client {
	id: number;
	name?: string | null;
	last_name?: string | null;
	email?: string | null;
	phone_number?: string | null;
}

interface Work {
	id: number;
	locality?: string | null;
	zone?: string | null;
	hood?: string | null;
	address?: string | null;
	client_id?: number | null;
	client_name?: string | null;
	client_last_name?: string | null;
}

interface EmailNotificationModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	client: Client | null;
	work: Work | null;
	onSendEmail: (data: EmailData) => Promise<void>;
}

interface EmailData {
	clientId: number;
	workId: number;
	to: string;
	subject: string;
	message: string;
	scheduledDate?: string;
	scheduledTime?: string;
}

export function EmailNotificationModal({
	isOpen,
	onOpenChange,
	client,
	work,
	onSendEmail,
}: EmailNotificationModalProps) {
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		to: '',
		subject: '',
		message: '',
		scheduledDate: '',
		scheduledTime: '',
	});

	const resetForm = () => {
		const defaultMessage = generateDefaultMessage();
		setFormData({
			to: client?.email || '',
			subject: '',
			message: defaultMessage,
			scheduledDate: '',
			scheduledTime: '',
		});
		setError(null);
	};

	const handleSend = async () => {
		if (!formData.to || !work) {
			setError('No se puede enviar el email: falta información del destinatario o la obra');
			return;
		}

		try {
			setIsSending(true);
			setError(null);

			const emailData: EmailData = {
				clientId: client?.id as number,
				workId: work.id,
				to: formData.to,
				subject: formData.subject || `Notificación sobre obra en ${work.locality}`,
				message: formData.message || generateDefaultMessage(),
				scheduledDate: formData.scheduledDate || undefined,
				scheduledTime: formData.scheduledTime || undefined,
			};

			await onSendEmail(emailData);
			toast({
				title: 'Email enviado',
				description: 'El email ha sido enviado correctamente.',
			});
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al enviar el email');
			toast({
				title: 'Error',
				description: translateError(err),
				variant: 'destructive',
			});
			console.error('Error sending email:', err);
		} finally {
			setIsSending(false);
		}
	};

	// Reset form when client or work changes
	useEffect(() => {
		if (isOpen && client && work) {
			resetForm();
		}
	}, [isOpen, client, work]);

	// Update message when scheduled date or time changes
	useEffect(() => {
		if (isOpen && client && work && (formData.scheduledDate || formData.scheduledTime)) {
			const clientName = `${client?.name || ''} ${client?.last_name || ''}`.trim();
			const workDetails = buildWorkDetails();

			let arrivalInfo = '';
			if (formData.scheduledDate || formData.scheduledTime) {
				arrivalInfo = '\n\nFecha y hora de llegada:\n';
				if (formData.scheduledDate) {
					arrivalInfo += `- Fecha: ${format(new Date(formData.scheduledDate + 'T00:00:00'), 'dd/MM/yyyy')}\n`;
				}
				if (formData.scheduledTime) {
					arrivalInfo += `- Hora: ${formData.scheduledTime}\n`;
				}
			}

			const newMessage = `Estimado/a ${clientName},

Le informamos que nuestro equipo de colocación estará llegando a la obra.${formData.scheduledDate || formData.scheduledTime ? ' en la fecha y horario indicados' : ' en las próximas horas'}.

Detalles de la obra:
${workDetails}${arrivalInfo}

Por favor, asegúrese de que el lugar esté accesible y preparado para la instalación.

Si tiene alguna pregunta o necesita coordinar algún detalle adicional, no dude en contactarnos.

Atentamente,
El equipo de Doceocho`;

			setFormData((prev) => ({
				...prev,
				message: newMessage,
			}));
		}
	}, [formData.scheduledDate, formData.scheduledTime, isOpen, client, work]);

	const buildWorkDetails = () => {
		const lines: string[] = [];
		if (work?.locality) lines.push(`- Localidad: ${work.locality}`);
		if (work?.zone) lines.push(`- Zona: ${work.zone}`);
		if (work?.hood) lines.push(`- Barrio: ${work.hood}`);
		if (work?.address) lines.push(`- Dirección: ${work.address}`);
		return lines.join('\n');
	};

	const generateDefaultMessage = () => {
		const clientName = `${client?.name || ''} ${client?.last_name || ''}`.trim();
		const workDetails = buildWorkDetails();

		let arrivalInfo = '';
		if (formData.scheduledDate || formData.scheduledTime) {
			arrivalInfo = '\n\nHora estimada de llegada:\n';
			if (formData.scheduledDate) {
				arrivalInfo += `- Fecha: ${format(new Date(formData.scheduledDate + 'T00:00:00'), 'dd/MM/yyyy')}\n`;
			}
			if (formData.scheduledTime) {
				arrivalInfo += `- Hora: ${formData.scheduledTime} Aproximadamente\n`;
			}
		}

		return `Estimado/a ${clientName},

Le informamos que nuestro equipo de colocación estará llegando a la obra.${formData.scheduledDate || formData.scheduledTime ? ' en la fecha y horario indicados' : ' en las próximas horas'}.

Detalles de la obra:
${workDetails}${arrivalInfo}

Por favor, asegúrese de que el lugar esté accesible y preparado para la instalación.

Si tiene alguna pregunta o necesita coordinar algún detalle adicional, no dude en contactarnos.

Atentamente,
El equipo de Doceocho`;
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	if (!client || !work) {
		return null;
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Mail className="h-5 w-5" />
						Enviar notificación por Email
					</DialogTitle>
					<DialogDescription>
						Envíe una notificación al cliente sobre la llegada del equipo de colocación
					</DialogDescription>
				</DialogHeader>

				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<div className="space-y-4">
					{/* Client and Work Info */}
					<div className="bg-secondary/50 rounded-lg p-4 space-y-3">
						<h4 className="font-medium text-sm">Información del Cliente y Obra</h4>

						<div className="space-y-2 text-sm">
							<div className="flex items-center gap-2">
								<User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<span className="font-medium">Cliente:</span>
								<span>
									{client.name} {client.last_name}
								</span>
							</div>

							<div className="flex items-center gap-2">
								<Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<span className="font-medium">Email:</span>
								<span className="text-blue-600 truncate">{client.email}</span>
							</div>

							<div className="flex items-center gap-2">
								<MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
								<span className="font-medium">Obra:</span>
								<span>
									{work.locality}
									{work.address ? `, ${work.address}` : ''}
								</span>
							</div>
						</div>
					</div>

					{/* Email Form */}
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="to">Destinatario</Label>
							<Input
								id="to"
								type="email"
								value={formData.to}
								onChange={(e) => handleInputChange('to', e.target.value)}
								placeholder="email@ejemplo.com"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="subject">Asunto del Email</Label>
							<Input
								id="subject"
								value={formData.subject}
								onChange={(e) => handleInputChange('subject', e.target.value)}
								placeholder={`Notificación sobre obra en ${work.locality}`}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="message">Mensaje</Label>
							<Textarea
								id="message"
								value={formData.message}
								onChange={(e) => handleInputChange('message', e.target.value)}
								placeholder="Escribe tu mensaje aquí..."
								className="min-h-[200px]"
							/>
						</div>

						{/* Arrival Time Information */}
						<div className="border-t pt-4">
							<h4 className="font-medium text-sm mb-3">Fecha y hora de llegada</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
								<div className="space-y-2">
									<Label htmlFor="scheduledDate">Fecha de llegada</Label>
									<Input
										id="scheduledDate"
										type="date"
										value={formData.scheduledDate}
										onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
										min={format(new Date(), 'yyyy-MM-dd')}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="scheduledTime">Hora de llegada</Label>
									<Input
										id="scheduledTime"
										type="time"
										value={formData.scheduledTime}
										onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
									/>
								</div>
							</div>
							{(formData.scheduledDate || formData.scheduledTime) && (
								<Alert>
									<Clock className="h-4 w-4" />
									<AlertDescription className="text-xs">
										El equipo de colocación llegará el{' '}
										{formData.scheduledDate &&
											format(new Date(formData.scheduledDate + 'T00:00:00'), 'dd/MM/yyyy')}
										{formData.scheduledTime && ` a las ${formData.scheduledTime} (Aproximadamente)`}
									</AlertDescription>
								</Alert>
							)}
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
						Cancelar
					</Button>
					<Button onClick={handleSend} disabled={isSending || !formData.to}>
						{isSending ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Enviando...
							</>
						) : (
							<>
								<Mail className="h-4 w-4 mr-2" />
								Enviar Email
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
