'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';

export default function AttendanceQRCode() {
	const [token, setToken] = useState('');
	const [error, setError] = useState(false);

	const loadQR = async () => {
		try {
			const res = await fetch('/api/attendance/qr');

			if (!res.ok) {
				throw new Error('No se pudo generar QR');
			}

			const data = await res.json();

			setToken(data.token);
			setError(false);
		} catch {
			setError(true);
		}
	};

	useEffect(() => {
		loadQR();

		const scheduleNextRefresh = () => {
			const now = new Date();
			const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

			const timeout = setTimeout(() => {
				loadQR();

				const interval = setInterval(loadQR, 60000);

				intervalRef = interval;
			}, msUntilNextMinute);

			timeoutRef = timeout;
		};

		let timeoutRef: ReturnType<typeof setTimeout>;
		let intervalRef: ReturnType<typeof setInterval>;

		scheduleNextRefresh();

		return () => {
			clearTimeout(timeoutRef);

			if (intervalRef) {
				clearInterval(intervalRef);
			}
		};
	}, []);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-[320px] space-y-3">
				<p className="text-sm text-destructive">No se pudo generar el código QR.</p>
				<Button variant="outline" onClick={loadQR}>
					Reintentar
				</Button>
			</div>
		);
	}

	if (!token) {
		return <div className="flex items-center justify-center h-[320px]">Cargando QR...</div>;
	}

	return (
		<QRCodeSVG
			className="w-full max-w-[280px] h-auto"
			value={token}
			size={320}
			level="M"
			marginSize={1}
		/>
	);
}
