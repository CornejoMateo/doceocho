'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function AttendanceQRCode() {
	const [token, setToken] = useState('');

	const loadQR = async () => {
		const res = await fetch('/api/attendance/qr');

		if (!res.ok) {
			return;
		}

		const data = await res.json();

		setToken(data.token);
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
