'use client';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface LocationHelpModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function LocationHelpModal({ open, onOpenChange }: LocationHelpModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<MapPin className="h-5 w-5 text-blue-500" />
						¿Cómo obtener coordenadas de Google Maps?
					</DialogTitle>
					<DialogDescription>
						Sigue estos pasos para obtener la latitud y longitud de tu ubicación
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-3">
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
								1
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium">Abre Google Maps</p>
								<p className="text-sm text-gray-600">
									Ve a maps.google.com o abre la app de Google Maps
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
								2
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium">Busca la ubicación</p>
								<p className="text-sm text-gray-600">
									Busca la dirección de tu empresa o haz clic derecho en el mapa
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
								3
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium">Obtén las coordenadas</p>
								<p className="text-sm text-gray-600">
									Haz clic derecho en el punto exacto y selecciona "Copiar coordenadas"
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
								4
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium">Pega las coordenadas</p>
								<p className="text-sm text-gray-600">
									El formato es: latitud, longitud (ej: -33.1301469, -64.3446391)
								</p>
							</div>
						</div>
					</div>
					<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
						<p className="text-sm text-blue-900">
							<strong>Ejemplo:</strong> Si Google Maps te da "-33.1301469, -64.3446391", usa
							-33.1301469 para latitud y -64.3446391 para longitud.
						</p>
					</div>
				</div>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)}>Entendido</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
