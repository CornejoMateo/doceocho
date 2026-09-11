'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';

interface CoordinatesHelpDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CoordinatesHelpDialog({ open, onOpenChange }: CoordinatesHelpDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<InfoIcon className="h-5 w-5" />
						Cómo obtener coordenadas de Google Maps
					</DialogTitle>
					<DialogDescription>
						Sigue estos pasos para obtener la latitud y longitud de tu ubicación
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<ol className="list-decimal list-inside space-y-3 text-sm">
						<li className="pl-2">
							Abre{' '}
							<a
								href="https://maps.google.com"
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-600 hover:underline font-medium"
							>
								Google Maps
							</a>{' '}
							en tu navegador
						</li>
						<li className="pl-2">
							Haz clic derecho en el lugar exacto donde quieres establecer la ubicación
						</li>
						<li className="pl-2">
							Selecciona la opción que dice las coordenadas (ejemplo: -33.13014693131956,
							-64.34463907854392)
						</li>
						<li className="pl-2">
							Copia el primer número (el que empieza con signo negativo o positivo) - ese es la{' '}
							<strong>latitud</strong>
						</li>
						<li className="pl-2">
							Copia el segundo número - ese es la <strong>longitud</strong>
						</li>
						<li className="pl-2">
							Pega ambos valores en los campos correspondientes del formulario
						</li>
					</ol>
					<div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
						<p className="text-sm text-blue-900 dark:text-blue-100">
							<strong>Ejemplo:</strong> Si Google Maps muestra "-33.13014693131956,
							-64.34463907854392", entonces:
							<br />
							• Latitud: -33.13014693131956
							<br />• Longitud: -64.34463907854392
						</p>
					</div>
				</div>
				<div className="flex justify-end">
					<Button type="button" onClick={() => onOpenChange(false)}>
						Entendido
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
