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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAttendanceSettings, updateAttendanceSettings } from '@/lib/attendance/attendance';
import { DEFAULT_RADIUS_METERS } from '@/constants/attendance/attendance';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

interface AttendanceSettingsProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AttendanceSettings({ open, onOpenChange }: AttendanceSettingsProps) {
	const [adminSquareMeters, setAdminSquareMeters] = useState<string>('');
	const [adminLoading, setAdminLoading] = useState(false);

	const loadSettings = async () => {
		const { data: settings } = await getAttendanceSettings();
		if (settings?.square_meters) {
			setAdminSquareMeters(settings.square_meters.toString());
		}
	};

	const handleAdminSave = async () => {
		const value = parseInt(adminSquareMeters, 10);

		if (isNaN(value) || value < DEFAULT_RADIUS_METERS) {
			toast({
				title: 'Error',
				description: `El radio debe ser al menos ${DEFAULT_RADIUS_METERS} metros`,
				variant: 'destructive',
			});
			return;
		}

		setAdminLoading(true);
		const { error } = await updateAttendanceSettings({ square_meters: value });
		setAdminLoading(false);

		if (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo guardar la configuración',
				variant: 'destructive',
			});
		} else {
			toast({
				title: 'Configuración guardada',
				description: 'El radio de ubicación se actualizó correctamente',
			});
			onOpenChange(false);
		}
	};

	// Load settings when dialog opens
	if (open && !adminSquareMeters) {
		loadSettings();
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Configuración de Asistencia</DialogTitle>
					<DialogDescription>Configura los parámetros del sistema de asistencia</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<Card>
						<CardHeader>
							<CardTitle className="text-lg">Radio de Ubicación</CardTitle>
							<CardDescription className="text-sm">
								Configura el radio máximo en metros para permitir el fichaje
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="admin-square-meters" className="text-sm">
									Radio en metros (por seguridad mínimo: {DEFAULT_RADIUS_METERS})
								</Label>
								<Input
									id="admin-square-meters"
									type="number"
									value={adminSquareMeters}
									onChange={(e) => setAdminSquareMeters(e.target.value)}
									min={DEFAULT_RADIUS_METERS}
									placeholder={DEFAULT_RADIUS_METERS.toString()}
									className="text-base"
								/>
							</div>
						</CardContent>
					</Card>
				</div>
				<DialogFooter>
					<Button onClick={handleAdminSave} disabled={adminLoading} className="w-full">
						{adminLoading ? 'Guardando...' : 'Guardar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
