'use client';

import { useState, useRef, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { Camera, X, Undo, Download } from 'lucide-react';

interface ImageEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImageReady: (imageFile: File) => boolean;
}

export function ImageEditorDialog({ open, onOpenChange, onImageReady }: ImageEditorDialogProps) {
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [brushColor, setBrushColor] = useState('#ff0000');
	const [brushSize, setBrushSize] = useState(3);
	const [isCameraReady, setIsCameraReady] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const cameraRequestIdRef = useRef(0);

	const startCamera = async () => {
		const requestId = ++cameraRequestIdRef.current;

		try {
			setIsCameraReady(false);
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
			});

			if (requestId !== cameraRequestIdRef.current) {
				stream.getTracks().forEach((track) => track.stop());
				return;
			}

			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				videoRef.current.onloadedmetadata = () => {
					if (requestId !== cameraRequestIdRef.current) return;
					setIsCameraReady(true);
				};
			}
		} catch (error) {
			if (requestId !== cameraRequestIdRef.current) return;
			console.error('Error accessing camera:', error);
			toast({
				variant: 'destructive',
				title: 'No se pudo acceder a la cámara',
				description: translateError(error),
			});
			setIsCameraReady(false);
		}
	};

	const stopCamera = () => {
		cameraRequestIdRef.current += 1;
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
		setIsCameraReady(false);
	};

	const captureImage = () => {
		if (!videoRef.current) {
			console.error('Video ref not available');
			return;
		}

		const video = videoRef.current;

		if (video.readyState !== 4) {
			console.error('Video not ready', video.readyState);
			toast({
				variant: 'destructive',
				title: 'La cámara aún no está lista',
				description: 'Espera un momento e intenta nuevamente.',
			});
			return;
		}

		if (video.videoWidth === 0 || video.videoHeight === 0) {
			console.error('Video has no dimensions', video.videoWidth, video.videoHeight);
			toast({
				variant: 'destructive',
				title: 'No se pudo obtener la imagen',
				description: 'Intenta nuevamente.',
			});
			return;
		}

		try {
			const captureCanvas = document.createElement('canvas');
			captureCanvas.width = video.videoWidth;
			captureCanvas.height = video.videoHeight;
			const captureContext = captureCanvas.getContext('2d');

			if (!captureContext) {
				console.error('Canvas context not available');
				return;
			}

			captureContext.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
			const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.9);
			setImageSrc(dataUrl);
			stopCamera();
		} catch (error) {
			console.error('Error capturing image:', error);
			toast({
				variant: 'destructive',
				title: 'Error al capturar la imagen',
				description: translateError(error),
			});
		}
	};

	const getPointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!canvasRef.current) {
			return null;
		}

		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;

		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		};
	};

	const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		canvasRef.current?.setPointerCapture?.(e.pointerId);
		setIsDrawing(true);
		draw(e);
	};

	const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		setIsDrawing(false);
		if (canvasRef.current) {
			const context = canvasRef.current.getContext('2d');
			if (context) {
				context.beginPath();
			}
		}
	};

	const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawing || !canvasRef.current) return;

		const point = getPointFromEvent(e);
		if (!point) return;

		const canvas = canvasRef.current;
		const context = canvas.getContext('2d');
		if (!context) return;

		context.lineWidth = brushSize;
		context.lineCap = 'round';
		context.strokeStyle = brushColor;

		context.lineTo(point.x, point.y);
		context.stroke();
		context.beginPath();
		context.moveTo(point.x, point.y);
	};

	const clearCanvas = () => {
		if (canvasRef.current && imageSrc) {
			const canvas = canvasRef.current;
			const context = canvas.getContext('2d');
			if (context) {
				const img = new Image();
				img.onload = () => {
					context.clearRect(0, 0, canvas.width, canvas.height);
					context.drawImage(img, 0, 0);
				};
				img.src = imageSrc;
			}
		}
	};

	const saveImage = () => {
		if (canvasRef.current) {
			canvasRef.current.toBlob(
				(blob) => {
					if (blob) {
						const file = new File([blob], 'camara-editada.jpg', { type: 'image/jpeg' });
						const shouldCloseAndReset = onImageReady(file);
						if (shouldCloseAndReset) {
							onOpenChange(false);
							resetEditor();
						}
					}
				},
				'image/jpeg',
				0.9
			);
		}
	};

	const resetEditor = () => {
		setImageSrc(null);
		setIsCameraReady(false);
		stopCamera();
		if (canvasRef.current) {
			const context = canvasRef.current.getContext('2d');
			if (context) {
				context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
			}
		}
	};

	useEffect(() => {
		if (imageSrc && canvasRef.current) {
			const canvas = canvasRef.current;
			const context = canvas.getContext('2d');
			if (!context) return;

			const img = new Image();
			img.onload = () => {
				canvas.width = img.width;
				canvas.height = img.height;
				context.clearRect(0, 0, canvas.width, canvas.height);
				context.drawImage(img, 0, 0, canvas.width, canvas.height);
			};
			img.src = imageSrc;
		}
	}, [imageSrc]);

	useEffect(() => {
		if (open && !imageSrc) {
			startCamera();
		}
		return () => {
			stopCamera();
		};
	}, [open, imageSrc]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-auto">
				<DialogHeader>
					<DialogTitle>Tomar foto y editar</DialogTitle>
					<DialogDescription>
						Toma una foto y dibuja sobre ella para marcar detalles importantes.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{!imageSrc ? (
						<div className="relative rounded-lg overflow-hidden bg-black aspect-video">
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="w-full h-full object-cover"
							/>
							{!isCameraReady && (
								<div className="absolute inset-0 flex items-center justify-center bg-black/50">
									<div className="text-white text-sm">Cargando cámara...</div>
								</div>
							)}
							<Button
								onClick={captureImage}
								className="absolute bottom-4 left-1/2 -translate-x-1/2"
								size="lg"
								disabled={!isCameraReady}
							>
								<Camera className="h-6 w-6 mr-2" />
								Capturar
							</Button>
						</div>
					) : (
						<div className="space-y-4">
							<div className="flex items-center gap-2 flex-wrap">
								<div className="flex items-center gap-2">
									<label className="text-sm">Color:</label>
									<input
										type="color"
										value={brushColor}
										onChange={(e) => setBrushColor(e.target.value)}
										className="w-8 h-8 rounded cursor-pointer"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-sm">Grosor:</label>
									<input
										type="range"
										min="1"
										max="10"
										value={brushSize}
										onChange={(e) => setBrushSize(Number(e.target.value))}
										className="w-24"
									/>
									<span className="text-sm">{brushSize}px</span>
								</div>
								<Button onClick={clearCanvas} variant="outline" size="sm">
									<Undo className="h-4 w-4 mr-2" />
									Deshacer dibujos
								</Button>
							</div>

							<div className="rounded-lg overflow-hidden border">
								<canvas
									ref={canvasRef}
									onPointerDown={startDrawing}
									onPointerMove={draw}
									onPointerUp={stopDrawing}
									onPointerLeave={stopDrawing}
									className="w-full cursor-crosshair touch-none"
								/>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							onOpenChange(false);
							resetEditor();
						}}
					>
						<X className="h-4 w-4 mr-2" />
						Cancelar
					</Button>
					{imageSrc && (
						<Button onClick={saveImage}>
							<Download className="h-4 w-4 mr-2" />
							Guardar y subir
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
