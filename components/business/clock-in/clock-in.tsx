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
import { Settings } from 'lucide-react';
import AttendanceQRCode from '@/components/business/clock-in/attendance-qr-code';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import QRScanner from './attendance-qr-scanner';

export function ClockIn() {
	const [isClockedIn, setIsClockedIn] = useState(false);
	const [isClockedInOvertime, setIsClockedInOvertime] = useState(false);
	const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [pendingClockAction, setPendingClockAction] = useState<{
		isOvertime: boolean;
		location: {
			latitude: number;
			longitude: number;
		};
	} | null>(null);

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
	};

	const loadAttendanceStatus = async () => {
		if (!user) return;

		console.log('user:', user);
		console.log('uid:', JSON.stringify(user?.uid));

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
			throw new Error(translateError(error));
		});

		const withinRadius = isWithinRadius(
			location.latitude,
			location.longitude,
			TARGET_LOCATION.latitude,
			TARGET_LOCATION.longitude,
			radiusMeters
		);

		if (!withinRadius) {
			throw new Error('Debes estar dentro del área permitida');
		}

		return location;
	};

	const finishClockAction = async (token: string) => {
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
				title: 'Error al registrar fichaje',
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
							<>
								{!isClockedIn && !isClockedInOvertime && (
									<>
										<Button onClick={() => handleClockAction(false)}>Registrar entrada</Button>

										<Button onClick={() => handleClockAction(true)}>
											Registrar entrada (horas extras)
										</Button>
									</>
								)}

								{isClockedIn && (
									<Button onClick={() => handleClockAction(false)}>Registrar salida</Button>
								)}

								{isClockedInOvertime && (
									<Button onClick={() => handleClockAction(true)}>
										Registrar salida (horas extras)
									</Button>
								)}
							</>
						)}
						<AttendanceHistory />
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
		</div>
	);
}
