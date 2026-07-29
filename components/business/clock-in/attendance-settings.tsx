'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
	DEFAULT_RADIUS_METERS,
	DEFAULT_PRICE_HOUR,
	DEFAULT_PRICE_HOUR_OVERTIME,
	TARGET_LOCATION,
} from '@/constants/attendance/attendance';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { Info } from 'lucide-react';
import { LocationHelpModal } from './location-help-modal';

interface AttendanceSettingsProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AttendanceSettings({ open, onOpenChange }: AttendanceSettingsProps) {
	const [adminSquareMeters, setAdminSquareMeters] = useState<string>(
		DEFAULT_RADIUS_METERS.toString()
	);
	const [priceHour, setPriceHour] = useState<string>(DEFAULT_PRICE_HOUR.toString());
	const [priceHourOvertime, setPriceHourOvertime] = useState<string>(
		DEFAULT_PRICE_HOUR_OVERTIME.toString()
	);
	const [targetLatitude, setTargetLatitude] = useState<string>(TARGET_LOCATION.latitude.toString());
	const [targetLongitude, setTargetLongitude] = useState<string>(
		TARGET_LOCATION.longitude.toString()
	);
	const [adminLoading, setAdminLoading] = useState(false);
	const [showHelpModal, setShowHelpModal] = useState(false);

	const loadSettings = useCallback(async () => {
		const { data: settings } = await getAttendanceSettings();
		if (settings?.square_meters) {
			setAdminSquareMeters(settings.square_meters.toString());
		} else {
			setAdminSquareMeters(DEFAULT_RADIUS_METERS.toString());
		}
		if (settings?.price_hour !== null && settings?.price_hour !== undefined) {
			setPriceHour(settings.price_hour.toString());
		}
		if (settings?.price_hour_overtime !== null && settings?.price_hour_overtime !== undefined) {
			setPriceHourOvertime(settings.price_hour_overtime.toString());
		}
		if (settings?.target_latitude) {
			setTargetLatitude(settings.target_latitude.toString());
		} else {
			setTargetLatitude(TARGET_LOCATION.latitude.toString());
		}
		if (settings?.target_longitude) {
			setTargetLongitude(settings.target_longitude.toString());
		} else {
			setTargetLongitude(TARGET_LOCATION.longitude.toString());
		}
	}, []);

	const handleAdminSave = async () => {
		const radiusValue = parseInt(adminSquareMeters, 10);
		const priceHourValue = parseFloat(priceHour);
		const priceHourOvertimeValue = parseFloat(priceHourOvertime);

		if (isNaN(radiusValue) || radiusValue < DEFAULT_RADIUS_METERS) {
			toast({
				title: 'Error',
				description: `El radio debe ser al menos ${DEFAULT_RADIUS_METERS} metros`,
				variant: 'destructive',
			});
			return;
		}

		if (isNaN(priceHourValue) || priceHourValue < 0) {
			toast({
				title: 'Error',
				description: 'El precio por hora debe ser un valor válido',
				variant: 'destructive',
			});
			return;
		}

		if (isNaN(priceHourOvertimeValue) || priceHourOvertimeValue < 0) {
			toast({
				title: 'Error',
				description: 'El precio por hora extra debe ser un valor válido',
				variant: 'destructive',
			});
			return;
		}

		const latitudeValue = parseFloat(targetLatitude);
		const longitudeValue = parseFloat(targetLongitude);

		if (isNaN(latitudeValue) || latitudeValue < -90 || latitudeValue > 90) {
			toast({
				title: 'Error',
				description: 'La latitud debe ser un valor válido entre -90 y 90',
				variant: 'destructive',
			});
			return;
		}

		if (isNaN(longitudeValue) || longitudeValue < -180 || longitudeValue > 180) {
			toast({
				title: 'Error',
				description: 'La longitud debe ser un valor válido entre -180 y 180',
				variant: 'destructive',
			});
			return;
		}

		setAdminLoading(true);
		const { error } = await updateAttendanceSettings({
			square_meters: radiusValue,
			price_hour: priceHourValue,
			price_hour_overtime: priceHourOvertimeValue,
			target_latitude: latitudeValue,
			target_longitude: longitudeValue,
		});
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
				description: 'La configuración se actualizó correctamente',
			});
			onOpenChange(false);
		}
	};

	useEffect(() => {
		if (open) {
			loadSettings();
		}
	}, [open, loadSettings]);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Configuración de Asistencia</DialogTitle>
						<DialogDescription>
							Configura los parámetros del sistema de asistencia
						</DialogDescription>
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
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Precios por Hora</CardTitle>
								<CardDescription className="text-sm">
									Configura los precios por hora para calcular los pagos a fin de mes
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="price-hour" className="text-sm">
										Precio por hora normal
									</Label>
									<Input
										id="price-hour"
										type="number"
										step="0.01"
										value={priceHour}
										onChange={(e) => setPriceHour(e.target.value)}
										min="0"
										placeholder={DEFAULT_PRICE_HOUR.toString()}
										className="text-base"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="price-hour-overtime" className="text-sm">
										Precio por hora extra
									</Label>
									<Input
										id="price-hour-overtime"
										type="number"
										step="0.01"
										value={priceHourOvertime}
										onChange={(e) => setPriceHourOvertime(e.target.value)}
										min="0"
										placeholder={DEFAULT_PRICE_HOUR_OVERTIME.toString()}
										className="text-base"
									/>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-lg">Ubicación Objetivo</CardTitle>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowHelpModal(true)}
										className="text-blue-600 hover:text-blue-700"
									>
										<Info className="h-4 w-4 mr-1" />
										¿Cómo obtener coordenadas?
									</Button>
								</div>
								<CardDescription className="text-sm">
									Configura la latitud y longitud de la ubicación de la empresa
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="target-latitude" className="text-sm">
										Latitud
									</Label>
									<Input
										id="target-latitude"
										type="number"
										step="0.0000001"
										value={targetLatitude}
										onChange={(e) => setTargetLatitude(e.target.value)}
										min="-90"
										max="90"
										placeholder={TARGET_LOCATION.latitude.toString()}
										className="text-base"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="target-longitude" className="text-sm">
										Longitud
									</Label>
									<Input
										id="target-longitude"
										type="number"
										step="0.0000001"
										value={targetLongitude}
										onChange={(e) => setTargetLongitude(e.target.value)}
										min="-180"
										max="180"
										placeholder={TARGET_LOCATION.longitude.toString()}
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
			<LocationHelpModal open={showHelpModal} onOpenChange={setShowHelpModal} />
		</>
	);
}
