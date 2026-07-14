'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getCurrentLocation } from '@/helpers/attendance/geolocation';
import { isWithinRadius } from '@/helpers/attendance/distance';
import {
	createAttendance,
	getAttendanceByDate,
	createAttendanceEntry,
} from '@/lib/attendance/attendance';
import { useAuth } from '@/components/provider/auth-provider';
import { toast } from '@/components/ui/use-toast';
import { TARGET_LOCATION, RADIUS_METERS } from '@/constants/attendance/attendance';

export function ClockIn() {
	const [isClockedIn, setIsClockedIn] = useState(false);
	const [isClockedInOvertime, setIsClockedInOvertime] = useState(false);
	const { user } = useAuth();

	// Show "en desarrollo" for Admin role
	if (user?.role === 'Admin') {
		return (
			<div className="flex items-center justify-center p-8">
				<p className="text-muted-foreground">En desarrollo</p>
			</div>
		);
	}

	const handleClockAction = async (isOvertime: boolean) => {
		try {
			// Get current location
			const location = await getCurrentLocation();

			// Check if within allowed radius
			const withinRadius = isWithinRadius(
				location.latitude,
				location.longitude,
				TARGET_LOCATION.latitude,
				TARGET_LOCATION.longitude,
				RADIUS_METERS
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
			const { data: existingAttendance } = await getAttendanceByDate(today);

			if (!existingAttendance) {
				const { data: newAttendance } = await createAttendance(today);
				attendance = newAttendance;
			} else {
				attendance = existingAttendance;
			}

			if (!attendance) {
				toast({
					title: 'Error',
					description: 'No se pudo crear el registro de asistencia',
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
					description: 'No se pudo registrar el fichaje',
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
				description: error instanceof Error ? error.message : 'Error al obtener ubicación',
				variant: 'destructive',
			});
		}
	};

	return (
		<div className="flex items-center justify-center gap-4 p-8">
			<Button onClick={() => handleClockAction(false)} size="lg" className="text-lg px-8 py-6">
				{isClockedIn ? 'Registrar salida' : 'Registrar entrada'}
			</Button>
			<Button onClick={() => handleClockAction(true)} size="lg" className="text-lg px-8 py-6">
				{isClockedInOvertime
					? 'Registrar salida (horas extras)'
					: 'Registrar entrada (horas extras)'}
			</Button>
		</div>
	);
}
