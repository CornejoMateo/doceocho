'use client';

import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
	onScan: (token: string) => void;
	onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const scannerRef = useRef<QrScanner | null>(null);

	const onScanRef = useRef(onScan);
	const [cameraError, setCameraError] = useState<string | null>(null);

	useEffect(() => {
		onScanRef.current = onScan;
	}, [onScan]);

	useEffect(() => {
		if (!videoRef.current) return;

		const scanner = new QrScanner(
			videoRef.current,
			(result) => {
				scanner.stop();

				onScanRef.current(result.data);
			},
			{
				preferredCamera: 'environment',
			}
		);

		scannerRef.current = scanner;

		scanner.start().catch((error) => {
			+setCameraError('No se pudo acceder a la cámara. Revisá los permisos.');
			console.error('Error iniciando cámara:', error);
		});

		return () => {
			scanner.stop();
			scanner.destroy();
		};
	}, []);

	return (
		<div className="flex flex-col items-center justify-center space-y-4">
			<video
				ref={videoRef}
				style={{
					width: '100%',
					maxWidth: 400,
				}}
			/>
			<Button variant="outline" onClick={onClose} className="w-full max-w-md">
				Cancelar
			</Button>
		</div>
	);
}
