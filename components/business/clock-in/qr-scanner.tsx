'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
	onScan: (decodedText: string) => void;
	onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
	const scannerRef = useRef<Html5Qrcode | null>(null);
	const isScanningRef = useRef(false);

	useEffect(() => {
		isScanningRef.current = true;

		const scanner = new Html5Qrcode('qr-reader');
		scannerRef.current = scanner;

		const config = {
			fps: 10,
			qrbox: { width: 250, height: 250 },
		};

		scanner
			.start(
				{ facingMode: 'environment' },
				config,
				(decodedText) => {
					if (isScanningRef.current && scannerRef.current) {
						isScanningRef.current = false;
						onScan(decodedText);
						// Stop scanner without waiting
						scannerRef.current.stop().catch(() => {});
					}
				},
				(errorMessage) => {
					// Ignore scanning errors
				}
			)
			.catch((error) => {
				console.error('Error starting scanner:', error);
				isScanningRef.current = false;
			});

		return () => {
			isScanningRef.current = false;
			if (scannerRef.current) {
				// Stop scanner and ignore any errors
				scannerRef.current.stop().catch(() => {});
				scannerRef.current = null;
			}
		};
	}, [onScan]);

	return (
		<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
			<div className="bg-white p-4 rounded-lg max-w-md w-full mx-4">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold">Escanea el QR</h3>
					<button onClick={onClose} className="text-gray-500 hover:text-gray-700">
						Cerrar
					</button>
				</div>
				<div id="qr-reader" className="w-full" />
			</div>
		</div>
	);
}
