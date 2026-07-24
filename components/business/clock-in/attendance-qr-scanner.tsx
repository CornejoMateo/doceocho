'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
	onScan: (token: string) => void;
	onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
	const scannerRef = useRef<Html5Qrcode | null>(null);

	useEffect(() => {
		const scanner = new Html5Qrcode('qr-reader');

		scannerRef.current = scanner;

		scanner.start(
			{
				facingMode: 'environment',
			},
			{
				fps: 10,
				qrbox: 250,
			},
			(decodedText) => {
				console.log('QR detectado:', decodedText);

				scanner.stop().then(() => {
					onScan(decodedText);
				});
			},
			() => {}
		);

		return () => {
			if (scannerRef.current) {
				scannerRef.current.stop().catch(() => {});
			}
		};
	}, []);

	return (
		<div>
			<div id="qr-reader" />

			<button onClick={onClose}>Cancelar</button>
		</div>
	);
}
