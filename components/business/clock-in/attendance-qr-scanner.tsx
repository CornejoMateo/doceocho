'use client';

import { useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
	onScan: (token: string) => void;
	onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const scannerRef = useRef<QrScanner | null>(null);

	useEffect(() => {
		if (!videoRef.current) return;

		const scanner = new QrScanner(
			videoRef.current,
			(result) => {
				console.log('QR detectado RAW:', JSON.stringify(result.data));

				scanner.stop();

				onScan(result.data);
			},
			{
				preferredCamera: 'environment',
			}
		);

		scannerRef.current = scanner;

		scanner.start().catch((error) => {
			console.error('Error iniciando cámara:', error);
		});

		return () => {
			scanner.stop();
			scanner.destroy();
		};
	}, [onScan]);

	return (
		<div>
			<video
				ref={videoRef}
				style={{
					width: '100%',
					maxWidth: 400,
				}}
			/>

			<button onClick={onClose}>Cancelar</button>
		</div>
	);
}
