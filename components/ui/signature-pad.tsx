'use client';

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SignaturePadHandle = {
	clear: () => void;
	isEmpty: () => boolean;
	/** PNG data URL with a transparent background, or null if nothing was drawn. */
	toDataUrl: () => string | null;
};

interface SignaturePadProps {
	className?: string;
	disabled?: boolean;
	onDrawingChange?: (hasDrawing: boolean) => void;
}

/**
 * Canvas to draw a signature with the mouse or a finger.
 * The background stays transparent so it can be stamped over the document.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
	{ className, disabled, onDrawingChange },
	ref
) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isDrawingRef = useRef(false);
	const hasDrawingRef = useRef(false);
	const [hasDrawing, setHasDrawing] = useState(false);

	// The canvas is sized to its box and scaled for the screen so lines stay sharp.
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const resize = () => {
			const { width, height } = canvas.getBoundingClientRect();
			const pixelRatio = window.devicePixelRatio || 1;

			canvas.width = Math.floor(width * pixelRatio);
			canvas.height = Math.floor(height * pixelRatio);

			const context = canvas.getContext('2d');
			if (!context) return;

			context.scale(pixelRatio, pixelRatio);
			context.lineWidth = 2;
			context.lineCap = 'round';
			context.lineJoin = 'round';
			context.strokeStyle = '#111827';
		};

		resize();
		window.addEventListener('resize', resize);

		return () => window.removeEventListener('resize', resize);
	}, []);

	const markDrawing = (value: boolean) => {
		hasDrawingRef.current = value;
		setHasDrawing(value);
		onDrawingChange?.(value);
	};

	const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();

		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (disabled) return;

		const context = canvasRef.current?.getContext('2d');
		if (!context) return;

		event.currentTarget.setPointerCapture(event.pointerId);
		isDrawingRef.current = true;

		const { x, y } = getPoint(event);
		context.beginPath();
		context.moveTo(x, y);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawingRef.current || disabled) return;

		const context = canvasRef.current?.getContext('2d');
		if (!context) return;

		const { x, y } = getPoint(event);
		context.lineTo(x, y);
		context.stroke();

		if (!hasDrawingRef.current) markDrawing(true);
	};

	const handlePointerUp = () => {
		isDrawingRef.current = false;
	};

	const clear = () => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext('2d');

		if (!canvas || !context) return;

		context.clearRect(0, 0, canvas.width, canvas.height);
		markDrawing(false);
	};

	useImperativeHandle(ref, () => ({
		clear,
		isEmpty: () => !hasDrawingRef.current,
		toDataUrl: () => {
			if (!hasDrawingRef.current) return null;

			return canvasRef.current?.toDataURL('image/png') ?? null;
		},
	}));

	return (
		<div className={cn('space-y-2', className)}>
			<canvas
				ref={canvasRef}
				// touch-none keeps a finger drawing instead of scrolling the page.
				className="h-40 w-full cursor-crosshair touch-none rounded-lg border border-border bg-white"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerLeave={handlePointerUp}
			/>
			<div className="flex items-center justify-between">
				<p className="text-xs text-muted-foreground">
					{hasDrawing ? 'Podés volver a empezar si no te gusta.' : 'Dibujá tu firma acá arriba.'}
				</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={clear}
					disabled={disabled || !hasDrawing}
					className="gap-2"
				>
					<Eraser className="h-4 w-4" />
					Borrar
				</Button>
			</div>
		</div>
	);
});
