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
import { Camera, X, Undo, Download, Type, Pencil, RotateCw, Trash2, Move } from 'lucide-react';

interface ImageEditorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImageReady: (imageFile: File) => boolean;
	initialFile?: File | null;
}

interface DraggableTextProps {
	text: {
		id: string;
		content: string;
		x: number;
		y: number;
		color: string;
		size: number;
		rotation: number;
	};
	onUpdate: (updates: Partial<DraggableTextProps['text']>) => void;
	onDelete: () => void;
	onRotate: () => void;
}

function DraggableText({ text, onUpdate, onDelete, onRotate }: DraggableTextProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isPinching, setIsPinching] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const [initialPinchDistance, setInitialPinchDistance] = useState(0);
	const [initialSize, setInitialSize] = useState(text.size);
	const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());

	const handlePointerDown = (e: React.PointerEvent) => {
		e.stopPropagation();
		pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (pointersRef.current.size === 2) {
			setIsPinching(true);
			setIsDragging(false);
			const pointers = Array.from(pointersRef.current.values());
			const distance = Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y);
			setInitialPinchDistance(distance);
			setInitialSize(text.size);
		} else if (pointersRef.current.size === 1) {
			setIsDragging(true);
			setDragOffset({
				x: e.clientX - text.x,
				y: e.clientY - text.y,
			});
		}
	};

	const handlePointerMove = (e: React.PointerEvent) => {
		e.stopPropagation();
		pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (isPinching && pointersRef.current.size === 2) {
			const pointers = Array.from(pointersRef.current.values());
			const distance = Math.hypot(pointers[1].x - pointers[0].x, pointers[1].y - pointers[0].y);
			const scale = distance / initialPinchDistance;
			const newSize = Math.max(10, Math.min(100, initialSize * scale));
			onUpdate({ size: newSize });
		} else if (isDragging && pointersRef.current.size === 1) {
			onUpdate({
				x: e.clientX - dragOffset.x,
				y: e.clientY - dragOffset.y,
			});
		}
	};

	const handlePointerUp = (e: React.PointerEvent) => {
		e.stopPropagation();
		pointersRef.current.delete(e.pointerId);

		if (pointersRef.current.size === 0) {
			setIsDragging(false);
			setIsPinching(false);
		} else if (pointersRef.current.size === 1) {
			setIsPinching(false);
			const remainingPointer = Array.from(pointersRef.current.values())[0];
			setIsDragging(true);
			setDragOffset({
				x: remainingPointer.x - text.x,
				y: remainingPointer.y - text.y,
			});
		}
	};

	return (
		<div
			className="absolute cursor-move select-none touch-none"
			style={{
				left: 0,
				top: 0,
				transform: `translate(${text.x}px, ${text.y}px) rotate(${text.rotation}deg)`,
				transformOrigin: 'top left',
				color: text.color,
				fontSize: `${text.size}px`,
				fontFamily: 'Arial',
				userSelect: 'none',
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerLeave={handlePointerUp}
			onPointerCancel={handlePointerUp}
		>
			<div className="flex items-center gap-2">
				<span className="font-bold">{text.content}</span>
				<div className="flex items-center gap-1">
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 md:h-6 md:w-6"
						onClick={(e) => {
							e.stopPropagation();
							onRotate();
						}}
					>
						<RotateCw className="h-4 w-4 md:h-3 md:w-3" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						className="h-8 w-8 md:h-6 md:w-6"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
					>
						<Trash2 className="h-4 w-4 md:h-3 md:w-3" />
					</Button>
				</div>
			</div>
		</div>
	);
}

export function ImageEditorDialog({
	open,
	onOpenChange,
	onImageReady,
	initialFile,
}: ImageEditorDialogProps) {
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [isDrawing, setIsDrawing] = useState(false);
	const [brushColor, setBrushColor] = useState('#ff0000');
	const [brushSize, setBrushSize] = useState(3);
	const [isCameraReady, setIsCameraReady] = useState(false);
	const [mode, setMode] = useState<'draw' | 'text'>('draw');
	const [textToInsert, setTextToInsert] = useState('');
	const [texts, setTexts] = useState<
		Array<{
			id: string;
			content: string;
			x: number;
			y: number;
			color: string;
			size: number;
			rotation: number;
		}>
	>([]);
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

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (mode !== 'text' || !textToInsert || !canvasRef.current) return;

		const rect = canvasRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const newText = {
			id: Date.now().toString(),
			content: textToInsert,
			x,
			y,
			color: brushColor,
			size: brushSize * 10,
			rotation: 0,
		};

		setTexts([...texts, newText]);
		setTextToInsert('');
	};

	const updateText = (id: string, updates: Partial<(typeof texts)[0]>) => {
		setTexts(texts.map((t) => (t.id === id ? { ...t, ...updates } : t)));
	};

	const deleteText = (id: string) => {
		setTexts(texts.filter((t) => t.id !== id));
	};

	const rotateText = (id: string) => {
		setTexts(texts.map((t) => (t.id === id ? { ...t, rotation: (t.rotation + 90) % 360 } : t)));
	};

	const clearCanvas = () => {
		setTexts([]);
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
			const canvas = canvasRef.current;
			const context = canvas.getContext('2d');
			if (!context) return;

			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;

			const tempCanvas = document.createElement('canvas');
			tempCanvas.width = canvas.width;
			tempCanvas.height = canvas.height;
			const tempContext = tempCanvas.getContext('2d');
			if (!tempContext) return;

			tempContext.drawImage(canvas, 0, 0);

			texts.forEach((text) => {
				tempContext.save();
				const scaledX = text.x * scaleX;
				const scaledY = text.y * scaleY;
				const scaledSize = text.size * scaleX;

				tempContext.font = `bold ${scaledSize}px Arial`;
				tempContext.fillStyle = text.color;
				tempContext.textBaseline = 'top';
				tempContext.textAlign = 'left';

				tempContext.translate(scaledX, scaledY);
				tempContext.rotate((text.rotation * Math.PI) / 180);

				tempContext.fillText(text.content, 0, 0);
				tempContext.restore();
			});

			tempCanvas.toBlob(
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
		setTexts([]);
		setIsCameraReady(false);
		stopCamera();
		if (canvasRef.current) {
			const context = canvasRef.current.getContext('2d');
			if (context) {
				context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
			}
		}
	};

	const loadInitialFile = (file: File) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			setImageSrc(e.target?.result as string);
		};
		reader.readAsDataURL(file);
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
			if (initialFile) {
				loadInitialFile(initialFile);
			} else {
				startCamera();
			}
		}
		return () => {
			stopCamera();
		};
	}, [open, imageSrc, initialFile]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-2xl max-h-[95dvh] overflow-auto p-4 md:p-6">
				<DialogHeader>
					<DialogTitle className="text-lg md:text-xl">
						{initialFile ? 'Editar imagen' : 'Tomar foto y editar'}
					</DialogTitle>
					<DialogDescription className="text-sm md:text-base">
						{initialFile
							? 'Dibuja sobre la imagen para marcar detalles importantes.'
							: 'Toma una foto y dibuja sobre ella para marcar detalles importantes.'}
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
									<label className="text-xs md:text-sm">Color:</label>
									<input
										type="color"
										value={brushColor}
										onChange={(e) => setBrushColor(e.target.value)}
										className="w-8 h-8 md:w-8 md:h-8 rounded cursor-pointer"
									/>
								</div>
								<div className="flex items-center gap-2">
									<label className="text-xs md:text-sm">Grosor:</label>
									<input
										type="range"
										min="1"
										max="10"
										value={brushSize}
										onChange={(e) => setBrushSize(Number(e.target.value))}
										className="w-20 md:w-24"
									/>
									<span className="text-xs md:text-sm">{brushSize}px</span>
								</div>
								<Button
									onClick={() => setMode('draw')}
									variant={mode === 'draw' ? 'default' : 'outline'}
									size="sm"
									className="text-xs md:text-sm"
								>
									<Pencil className="h-4 w-4 mr-1 md:mr-2" />
									<span className="hidden md:inline">Dibujar</span>
								</Button>
								<Button
									onClick={() => setMode('text')}
									variant={mode === 'text' ? 'default' : 'outline'}
									size="sm"
									className="text-xs md:text-sm"
								>
									<Type className="h-4 w-4 mr-1 md:mr-2" />
									<span className="hidden md:inline">Texto</span>
								</Button>
								<Button
									onClick={clearCanvas}
									variant="outline"
									size="sm"
									className="text-xs md:text-sm"
								>
									<Undo className="h-4 w-4 mr-1 md:mr-2" />
									<span className="hidden md:inline">Deshacer</span>
								</Button>
							</div>

							{mode === 'text' && (
								<div className="flex items-center gap-2">
									<input
										type="text"
										value={textToInsert}
										onChange={(e) => setTextToInsert(e.target.value)}
										placeholder="Escribe el texto (ej: 2.5m, 10cm)"
										className="flex-1 px-3 py-2 border rounded-md text-[16px]"
										onKeyDown={(e) => {
											if (e.key === 'Escape') {
												setTextToInsert('');
											}
										}}
									/>
									{textToInsert && (
										<Button
											onClick={() => setTextToInsert('')}
											variant="outline"
											size="sm"
											className="h-10 w-10"
										>
											<X className="h-4 w-4" />
										</Button>
									)}
								</div>
							)}

							<div className="rounded-lg overflow-hidden border relative">
								<canvas
									ref={canvasRef}
									onPointerDown={mode === 'draw' ? startDrawing : undefined}
									onPointerMove={mode === 'draw' ? draw : undefined}
									onPointerUp={mode === 'draw' ? stopDrawing : undefined}
									onPointerLeave={mode === 'draw' ? stopDrawing : undefined}
									onClick={mode === 'text' ? handleCanvasClick : undefined}
									className={`w-full touch-none ${
										mode === 'text' && textToInsert
											? 'cursor-text'
											: mode === 'text'
												? 'cursor-default'
												: 'cursor-crosshair'
									}`}
								/>
								{texts.map((text) => (
									<DraggableText
										key={text.id}
										text={text}
										onUpdate={(updates) => updateText(text.id, updates)}
										onDelete={() => deleteText(text.id)}
										onRotate={() => rotateText(text.id)}
									/>
								))}
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="flex-col sm:flex-row gap-2">
					<Button
						variant="outline"
						onClick={() => {
							onOpenChange(false);
							resetEditor();
						}}
						className="w-full sm:w-auto"
					>
						<X className="h-4 w-4 mr-2" />
						Cancelar
					</Button>
					{imageSrc && (
						<Button onClick={saveImage} className="w-full sm:w-auto">
							<Download className="h-4 w-4 mr-2" />
							Guardar y subir
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
