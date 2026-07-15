'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentLocation } from '@/helpers/attendance/geolocation';
import { isWithinRadius } from '@/helpers/attendance/distance';
import {
	createAttendance,
	getAttendanceByDate,
	createAttendanceEntry,
	getAttendanceSettings,
	updateAttendanceSettings,
} from '@/lib/attendance/attendance';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { TARGET_LOCATION, DEFAULT_RADIUS_METERS } from '@/constants/attendance/attendance';
import { AttendanceHistory } from './attendance-history';
import { AdminAttendanceHistory } from './admin-attendance-history';

export function ClockIn() {
	const [isClockedIn, setIsClockedIn] = useState(false);
	const [isClockedInOvertime, setIsClockedInOvertime] = useState(false);
	const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS);
	const [adminSquareMeters, setAdminSquareMeters] = useState<string>('');
	const [adminLoading, setAdminLoading] = useState(false);
	const { user } = useAuth();

	// Load state from localStorage on mount
	useEffect(() => {
		async function loadSettings() {
			const { data: settings } = await getAttendanceSettings();
			if (settings?.square_meters && settings.square_meters >= DEFAULT_RADIUS_METERS) {
				setRadiusMeters(settings.square_meters);
				setAdminSquareMeters(settings.square_meters.toString());
			}
		}

		// Load attendance state from localStorage
		const today = new Date().toISOString().split('T')[0];
		const savedState = localStorage.getItem(`attendance_state_${today}`);
		if (savedState) {
			try {
				const state = JSON.parse(savedState);
				setIsClockedIn(state.isClockedIn || false);
				setIsClockedInOvertime(state.isClockedInOvertime || false);
			} catch (e) {
				// If parsing fails, use default state
			}
		}

		loadSettings();
	}, []);

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
			// Get current location
			const location = await getCurrentLocation();

			// Check if within allowed radius
			const withinRadius = isWithinRadius(
				location.latitude,
				location.longitude,
				TARGET_LOCATION.latitude,
				TARGET_LOCATION.longitude,
				radiusMeters
			);

			if (!withinRadius) {
				toast({
					title: 'Ubicación no permitida',
					description: 'Debes estar dentro del área permitida para fichar',
					variant: 'destructive',
				});
				return;
			}

			// Get current date
			const today = new Date().toISOString().split('T')[0];

			// Get or create attendance
			let attendance;
			const { data: existingAttendance, error: getError } = await getAttendanceByDate(
				today,
				user.uid
			);

			if (getError) {
				toast({
					title: 'Error',
					description: translateError(getError) || 'No se pudo obtener el registro de asistencia',
					variant: 'destructive',
				});
				return;
			}

			if (!existingAttendance) {
				const { data: newAttendance, error: createError } = await createAttendance(today, user.uid);
				if (createError) {
					toast({
						title: 'Error',
						description:
							translateError(createError) || 'No se pudo crear el registro de asistencia',
						variant: 'destructive',
					});
					return;
				}
				attendance = newAttendance;
			} else {
				attendance = existingAttendance;
			}

			if (!attendance) {
				toast({
					title: 'Error',
					description: translateError('error') || 'No se pudo crear el registro de asistencia',
					variant: 'destructive',
				});
				return;
			}

			// Determine entry type
			const entryType = isOvertime
				? isClockedInOvertime
					? 'overtime_out'
					: 'overtime_in'
				: isClockedIn
					? 'regular_out'
					: 'regular_in';

			// Create entry
			const { error: entryError } = await createAttendanceEntry({
				attendance_id: attendance.id,
				type: entryType,
				entry_time: new Date().toISOString(),
				latitude: location.latitude,
				longitude: location.longitude,
			});

			if (entryError) {
				toast({
					title: 'Error',
					description: translateError('error') || 'No se pudo registrar el fichaje',
					variant: 'destructive',
				});
				return;
			}

			// Update local state
			if (isOvertime) {
				setIsClockedInOvertime(!isClockedInOvertime);
			} else {
				setIsClockedIn(!isClockedIn);
			}

			// Save state to localStorage
			const attendanceDate = new Date().toISOString().split('T')[0];
			const newState = {
				isClockedIn: isOvertime ? isClockedIn : !isClockedIn,
				isClockedInOvertime: isOvertime ? !isClockedInOvertime : isClockedInOvertime,
			};
			localStorage.setItem(`attendance_state_${attendanceDate}`, JSON.stringify(newState));

			toast({
				title: 'Fichaje registrado',
				description: isOvertime
					? isClockedInOvertime
						? 'Salida (horas extras) registrada'
						: 'Entrada (horas extras) registrada'
					: isClockedIn
						? 'Salida registrada'
						: 'Entrada registrada',
			});
		} catch (error) {
			toast({
				title: 'Error',
				description: translateError('error') || 'Error al obtener ubicación',
				variant: 'destructive',
			});
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
				description: translateError('error') || 'No se pudo guardar la configuración',
				variant: 'destructive',
			});
		} else {
			setRadiusMeters(value);
			toast({
				title: 'Configuración guardada',
				description: translateError('error') || 'El radio de ubicación se actualizó correctamente',
			});
		}
	};

	return (
		<div className="container mx-auto p-4 md:p-8">
			<div className="grid gap-4 md:gap-6">
				{user?.role === 'Admin' && (
					<>
						<Card className="max-w-md mx-auto">
							<CardHeader>
								<CardTitle className="text-lg md:text-xl">Configuración de Asistencia</CardTitle>
								<CardDescription className="text-sm md:text-base">
									Configura el radio máximo en metros para permitir el fichaje
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="admin-square-meters" className="text-sm md:text-base">
										Radio en metros (por seguridad mínimo: {DEFAULT_RADIUS_METERS})
									</Label>
									<Input
										id="admin-square-meters"
										type="number"
										value={adminSquareMeters}
										onChange={(e) => setAdminSquareMeters(e.target.value)}
										min={DEFAULT_RADIUS_METERS}
										placeholder="40"
										className="text-base"
									/>
								</div>
								<Button onClick={handleAdminSave} disabled={adminLoading} className="w-full">
									{adminLoading ? 'Guardando...' : 'Guardar'}
								</Button>
							</CardContent>
						</Card>
						<AdminAttendanceHistory />
					</>
				)}
				{user?.role !== 'Admin' && (
					<>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
							<Button
								onClick={() => handleClockAction(false)}
								size="lg"
								className="text-base md:text-lg px-6 py-4 md:px-8 md:py-6 w-full sm:w-auto min-h-[60px] md:min-h-[72px]"
							>
								{isClockedIn ? 'Registrar salida' : 'Registrar entrada'}
							</Button>
							<Button
								onClick={() => handleClockAction(true)}
								size="lg"
								className="text-base md:text-lg px-6 py-4 md:px-8 md:py-6 w-full sm:w-auto min-h-[60px] md:min-h-[72px]"
							>
								{isClockedInOvertime
									? 'Registrar salida (horas extras)'
									: 'Registrar entrada (horas extras)'}
							</Button>
						</div>
						<AttendanceHistory />
					</>
				)}
			</div>
		</div>
	);
}
