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
	const [retryCount, setRetryCount] = useState(0);

	useEffect(() => {
		onScanRef.current = onScan;
	}, [onScan]);

	useEffect(() => {
		if (!videoRef.current) return;

		setCameraError(null);

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
			setCameraError('No se pudo acceder a la cámara. Revisá los permisos.');
			console.error('Error iniciando cámara:', error);
		});

		return () => {
			scanner.stop();
			scanner.destroy();
		};
	}, [retryCount]);

	return (
		<div className="flex flex-col items-center justify-center space-y-4">
			{!cameraError ? (
				<video
					ref={videoRef}
					style={{
						width: '100%',
						maxWidth: 400,
					}}
				/>
			) : (
				<div role="alert" className="mt-5 text-red-500 text-center">
					{cameraError}
				</div>
			)}
			<div className="flex gap-2 w-full max-w-md">
				<Button type="button" variant="outline" onClick={onClose} className="flex-1">
					Cancelar
				</Button>
				{cameraError && (
					<Button type="button" onClick={() => setRetryCount((c) => c + 1)} className="flex-1">
						Reintentar
					</Button>
				)}
			</div>
		</div>
	);
}
