'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { getCurrentLocation } from '@/helpers/attendance/geolocation';
import { isWithinRadius } from '@/helpers/attendance/distance';
import { getAttendanceSettings } from '@/lib/attendance/attendance-settings';
import { getAttendanceStatus } from '@/lib/attendance/attendance-entries';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { TARGET_LOCATION, DEFAULT_RADIUS_METERS } from '@/constants/attendance/attendance';
import { AttendanceHistory } from './attendance-history';
import { AdminAttendanceHistory } from './admin-attendance-history';
import { AttendanceSettings } from './attendance-settings';
import { AttendanceEntryModal } from './attendance-entry-modal';
import { SettlementsModal } from './settlements-modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import AttendanceQRCode from '@/components/business/clock-in/attendance-qr-code';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import QRScanner from './attendance-qr-scanner';
import { listUsers, User } from '@/lib/users/users';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';

export function ClockIn() {
	const adminHistoryRef = useRef<{ loadHistory: () => Promise<void> }>(null);
	const [isClockedIn, setIsClockedIn] = useState(false);
	const [isClockedInOvertime, setIsClockedInOvertime] = useState(false);
	const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS);
	const [latitude, setLatitude] = useState<number | null>(null);
	const [longitude, setLongitude] = useState<number | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [createEntryModalOpen, setCreateEntryModalOpen] = useState(false);
	const [settlementsModalOpen, setSettlementsModalOpen] = useState(false);
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

	const {
		data: users,
		loading: loadingUsers,
		error: usersError,
		refresh,
	} = useOptimizedRealtime<User>(
		'users',
		async () => {
			const { data } = await listUsers();
			return data ?? [];
		},
		'users_cache'
	);

	useEffect(() => {
		if (!user) return;
		if (!user.uid) return;

		const init = async () => {
			await loadSettings();
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
		if (settings?.target_latitude !== null && settings?.target_latitude !== undefined) {
			setLatitude(settings.target_latitude);
		} else {
			setLatitude(TARGET_LOCATION.latitude);
		}
		if (settings?.target_longitude !== null && settings?.target_longitude !== undefined) {
			setLongitude(settings.target_longitude);
		} else {
			setLongitude(TARGET_LOCATION.longitude);
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
			throw new Error(translateError(error));
		});

		const withinRadius = isWithinRadius(
			location.latitude,
			location.longitude,
			latitude || TARGET_LOCATION.latitude,
			longitude || TARGET_LOCATION.longitude,
			radiusMeters
		);

		if (!withinRadius) {
			throw new Error('Debes estar dentro del área permitida');
		}

		return location;
	};

	const finishClockAction = async (token: string) => {
		try {
			await validateLocation();
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError(error),
				variant: 'destructive',
			});
			throw error;
		}
		const loadingToast = toast({
			title: 'Registrando fichaje...',
			description: 'Validando datos y guardando en la base de datos.',
		});

		try {
			const registerResponse = await fetch('/api/attendance/register-attendance', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token,
					isOvertime: pendingClockAction?.isOvertime,
					latitude: pendingClockAction?.location.latitude,
					longitude: pendingClockAction?.location.longitude,
					radiusMeters: radiusMeters,
					lat: latitude || TARGET_LOCATION.latitude,
					long: longitude || TARGET_LOCATION.longitude,
					username: user?.username || '',
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
				<Tabs defaultValue="hour">
					<TabsList>
						<TabsTrigger value="hour">Por hora</TabsTrigger>
						<TabsTrigger value="module">Por módulo</TabsTrigger>
					</TabsList>

					<TabsContent value="hour">
						{isAuthorized && (
							<>
								<div className="flex justify-center sm:justify-end gap-2 mb-4">
									<Button variant="outline" onClick={() => setCreateEntryModalOpen(true)}>
										Crear registro
									</Button>
									<Button variant="outline" onClick={() => setSettlementsModalOpen(true)}>
										Liquidaciones
									</Button>
									<Button variant="outline" onClick={() => setSettingsOpen(true)}>
										<Settings className="h-4 w-4 mr-2" />
										Configuración
									</Button>
								</div>
								<AdminAttendanceHistory ref={adminHistoryRef} users={users} />
							</>
						)}
						{isTaller && (
							<>
								{loading ? (
									<p className="text-muted-foreground text-sm text-center">Cargando...</p>
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
					</TabsContent>

					<TabsContent value="module">
						<Card className="w-full">
							<CardHeader>
								<CardTitle>Fichaje por módulo</CardTitle>
								<CardDescription>
									Sección en construcción. Aquí iremos agregando la funcionalidad por módulo.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">Por ahora no hay nada para mostrar.</p>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
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
			<AttendanceEntryModal
				entry={null}
				open={createEntryModalOpen}
				onOpenChange={setCreateEntryModalOpen}
				onUpdate={() => {
					adminHistoryRef.current?.loadHistory();
				}}
				showUserSelect={true}
				users={users || []}
			/>
			<SettlementsModal open={settlementsModalOpen} onOpenChange={setSettlementsModalOpen} />
		</div>
	);
}
