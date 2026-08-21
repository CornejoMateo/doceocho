'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';

export default function AttendanceQRCode() {
	const [token, setToken] = useState('');
	const [error, setError] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(60);

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
		let timeoutRef: ReturnType<typeof setTimeout>;
		let intervalRef: ReturnType<typeof setInterval>;
		let countdownRef: ReturnType<typeof setInterval>;
		let nextRefreshAt = Date.now() + 60000;

		const updateCountdown = () => {
			const remaining = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
			setSecondsLeft(remaining);
		};

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				loadQR();
				nextRefreshAt = Date.now() + 60000;
			}
		};

		loadQR();

		const scheduleNextRefresh = () => {
			const now = new Date();
			const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
			nextRefreshAt = Date.now() + msUntilNextMinute;

			const timeout = setTimeout(() => {
				loadQR();
				nextRefreshAt = Date.now() + 60000;

				const interval = setInterval(() => {
					loadQR();
					nextRefreshAt = Date.now() + 60000;
				}, 60000);

				intervalRef = interval;
			}, msUntilNextMinute);

			timeoutRef = timeout;
		};

		scheduleNextRefresh();
		countdownRef = setInterval(updateCountdown, 1000);
		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			clearTimeout(timeoutRef);

			if (intervalRef) {
				clearInterval(intervalRef);
			}

			clearInterval(countdownRef);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, []);

	if (!token) {
		if (error) {
			return (
				<div className="flex flex-col items-center justify-center h-[320px] gap-3">
					<p className="text-sm text-destructive">No se pudo generar el QR</p>
					<Button type="button" variant="outline" size="sm" onClick={loadQR}>
						Reintentar
					</Button>
				</div>
			);
		}

		return <div className="flex items-center justify-center h-[320px]">Cargando QR...</div>;
	}

	return (
		<div className="flex flex-col items-center gap-3">
			<QRCodeSVG
				className="w-full max-w-[280px] h-auto"
				value={token}
				size={320}
				level="M"
				marginSize={1}
			/>
			<p className="text-xs text-muted-foreground">Se renueva en {secondsLeft}s</p>
		</div>
	);
}
