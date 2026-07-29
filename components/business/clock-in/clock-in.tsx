'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getCurrentLocation } from '@/helpers/attendance/geolocation';
import { isWithinRadius } from '@/helpers/attendance/distance';
import { getAttendanceSettings, getAttendanceStatus } from '@/lib/attendance/attendance';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { TARGET_LOCATION, DEFAULT_RADIUS_METERS } from '@/constants/attendance/attendance';
import { AttendanceHistory } from './attendance-history';
import { AdminAttendanceHistory } from './admin-attendance-history';
import { AttendanceSettings } from './attendance-settings';
import { Settings, MapPin, AlertCircle } from 'lucide-react';
import AttendanceQRCode from '@/components/business/clock-in/attendance-qr-code';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import QRScanner from './attendance-qr-scanner';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

export function ClockIn() {
	const [isClockedIn, setIsClockedIn] = useState(false);
	const [isClockedInOvertime, setIsClockedInOvertime] = useState(false);
	const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS);
	const [targetLocation, setTargetLocation] = useState(TARGET_LOCATION);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [pendingClockAction, setPendingClockAction] = useState<{
		isOvertime: boolean;
		location: {
			latitude: number;
			longitude: number;
		};
	} | null>(null);
	const [locationPermissionModal, setLocationPermissionModal] = useState(false);

	const { user } = useAuth();

	const [showScanner, setShowScanner] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		if (!user.uid) return;

		const init = async () => {
			if (isAuthorized) {
				await loadSettings();
			}
			await loadAttendanceStatus();
			setLoading(false);
		};

		init();
	}, [user]);

	const isAuthorized = user?.role === 'Admin';
	const isTaller = user?.role === 'Taller';
	const isQR = user?.role === 'QR';

	const loadSettings = async () => {
		const { data: settings } = await getAttendanceSettings();
		if (settings?.square_meters) {
			setRadiusMeters(settings.square_meters);
		}
		if (settings?.target_latitude && settings?.target_longitude) {
			setTargetLocation({
				latitude: settings.target_latitude,
				longitude: settings.target_longitude,
			});
		}
	};

	const loadAttendanceStatus = async () => {
		if (!user) return;

		const { data, error } = await getAttendanceStatus(user.uid);

		if (error) {
			toast({
				title: 'Error',
				description: translateError(error),
				variant: 'destructive',
			});
			return;
		}

		setIsClockedIn(data?.regularOpen ?? false);
		setIsClockedInOvertime(data?.overtimeOpen ?? false);
	};

	const validateLocation = async () => {
		const location = await getCurrentLocation().catch((error) => {
			// Check if it's a permission error and show modal
			const errorMessage = error?.message || String(error);
			if (
				errorMessage.includes('PERMISSION_DENIED') ||
				errorMessage.includes('origin does not have permission') ||
				errorMessage.includes('Permiso de ubicación denegado')
			) {
				setLocationPermissionModal(true);
				throw new Error('Permiso de ubicación requerido');
			}
			throw new Error(translateError(error));
		});

		const withinRadius = isWithinRadius(
			location.latitude,
			location.longitude,
			targetLocation.latitude,
			targetLocation.longitude,
			radiusMeters
		);

		if (!withinRadius) {
			throw new Error('Debes estar dentro del área permitida');
		}

		return location;
	};

	const finishClockAction = async (token: string) => {
		validateLocation().catch((error) => {
			toast({
				title: 'Error',
				description: translateError(error),
				variant: 'destructive',
			});
			throw error;
		});
		const loadingToast = toast({
			title: 'Registrando fichaje...',
			description: 'Validando datos y guardando en la base de datos.',
		});

		try {
			const validateResponse = await fetch('/api/attendance/check-in', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ token }),
			});

			if (!validateResponse.ok) {
				const data = await validateResponse.json();
				throw new Error(data.message);
			}

			const registerResponse = await fetch('/api/attendance/register-attendance', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					isOvertime: pendingClockAction?.isOvertime,
					latitude: pendingClockAction?.location.latitude,
					longitude: pendingClockAction?.location.longitude,
					radiusMeters: radiusMeters,
				}),
			});

			if (!registerResponse.ok) {
				const data = await registerResponse.json();
				throw new Error(data.message);
			}

			await loadAttendanceStatus();

			const isCheckOut = isClockedIn || isClockedInOvertime;

			loadingToast.update({
				id: loadingToast.id,
				title: 'Fichaje registrado',
				description: isCheckOut
					? 'Salida registrada correctamente'
					: 'Entrada registrada correctamente',
			});
		} catch (error) {
			loadingToast.update({
				id: loadingToast.id,
				title:
					'Error al registrar fichaje. Saca una foto del error para poder mostrarsela a los desarrolladores',
				description: translateError(error),
				variant: 'destructive',
			});
			throw error;
		}
	};

	const handleClockAction = async (isOvertime: boolean) => {
		if (!user) {
			toast({
				title: 'Error',
				description: 'Usuario no autenticado',
				variant: 'destructive',
			});
			return;
		}

		try {
			const location = await validateLocation();

			setPendingClockAction({
				isOvertime,
				location,
			});

			setShowScanner(true);
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error),
				variant: 'destructive',
			});
		}
	};

	return (
		<div className="container mx-auto p-4 md:p-8">
			<div className="grid gap-4 md:gap-6">
				{isAuthorized && (
					<>
						<div className="flex justify-end">
							<Button variant="outline" onClick={() => setSettingsOpen(true)}>
								<Settings className="h-4 w-4 mr-2" />
								Configuración
							</Button>
						</div>
						<AdminAttendanceHistory />
					</>
				)}
				{isTaller && (
					<>
						{loading ? (
							<p className="text-muted-foreground text-sm">Cargando...</p>
						) : (
							<div className="flex flex-col items-center gap-4 w-full">
								<div className="flex flex-col sm:flex-row gap-2 w-full max-w-2xl">
									{!isClockedIn && !isClockedInOvertime && (
										<>
											<Button onClick={() => handleClockAction(false)} className="flex-1">
												Registrar entrada
											</Button>

											<Button onClick={() => handleClockAction(true)} className="flex-1">
												Registrar entrada (horas extras)
											</Button>
										</>
									)}

									{isClockedIn && (
										<Button onClick={() => handleClockAction(false)} className="w-full">
											Registrar salida
										</Button>
									)}

									{isClockedInOvertime && (
										<Button onClick={() => handleClockAction(true)} className="w-full">
											Registrar salida (horas extras)
										</Button>
									)}
								</div>

								<div className="w-full max-w-2xl">
									<AttendanceHistory />
								</div>
							</div>
						)}
					</>
				)}
				{isQR && (
					<Card className="w-full max-w-md mx-auto">
						<CardHeader>
							<CardTitle>QR de fichaje</CardTitle>
							<CardDescription>
								Escaneá este código desde la aplicación móvil. El QR cambia automáticamente cada
								minuto.
							</CardDescription>
						</CardHeader>

						<CardContent className="flex justify-center overflow-hidden">
							<AttendanceQRCode />
						</CardContent>
					</Card>
				)}
				{showScanner && isTaller && (
					<QRScanner
						onClose={() => {
							setShowScanner(false);
							setPendingClockAction(null);
						}}
						onScan={async (token) => {
							setShowScanner(false);

							try {
								await finishClockAction(token);
							} catch {
							} finally {
								setPendingClockAction(null);
							}
						}}
					/>
				)}
			</div>
			<AttendanceSettings
				open={settingsOpen}
				onOpenChange={(open) => {
					setSettingsOpen(open);
					if (!open) {
						// Reload settings when closing to update radiusMeters
						loadSettings();
					}
				}}
			/>
			<Dialog open={locationPermissionModal} onOpenChange={setLocationPermissionModal}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<MapPin className="h-5 w-5 text-orange-500" />
							Permiso de ubicación requerido
						</DialogTitle>
						<DialogDescription>
							Necesitamos tu ubicación para registrar el fichaje y verificar que estás dentro del
							área permitida.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
							<AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-orange-900">
								<p className="font-semibold mb-1">Instrucciones para iOS:</p>
								<ol className="list-decimal list-inside space-y-1">
									<li>
										Ve a <strong>Configuración</strong>
									</li>
									<li>Busca esta aplicación</li>
									<li>
										Toca <strong>Ubicación</strong>
									</li>
									<li>
										Selecciona <strong>Mientras usas la app</strong>
									</li>
								</ol>
							</div>
						</div>
						<div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
							<AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-blue-900">
								<p className="font-semibold mb-1">Instrucciones para Android:</p>
								<ol className="list-decimal list-inside space-y-1">
									<li>Toca el botón de permisos en tu navegador</li>
									<li>
										Selecciona <strong>Permitir</strong> para la ubicación
									</li>
								</ol>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setLocationPermissionModal(false)}>
							Cancelar
						</Button>
						<Button
							onClick={() => {
								setLocationPermissionModal(false);
								// Retry the clock action
								if (pendingClockAction) {
									handleClockAction(pendingClockAction.isOvertime);
								}
							}}
						>
							Intentar nuevamente
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
