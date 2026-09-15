'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type RenderedSize = { width: number; height: number };

interface PdfPageViewerProps {
	url: string;
	/** Controlled page number (1-based). Leave out to let the viewer own it. */
	page?: number;
	onPageChange?: (page: number) => void;
	onRendered?: (size: RenderedSize, totalPages: number) => void;
	/** Drawn on top of the page, aligned with it. */
	overlay?: React.ReactNode;
	/** Applied to the scrolling page area, so the pager stays visible below it. */
	pageAreaClassName?: string;
	className?: string;
}

/**
 * Renders one page of a PDF to a canvas with pdf.js.
 * The canvas is laid out at its CSS size, so anything positioned on top of it
 * lines up with the page no matter the device pixel ratio.
 */
export function PdfPageViewer({
	url,
	page,
	onPageChange,
	onRendered,
	overlay,
	pageAreaClassName,
	className,
}: PdfPageViewerProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

	const [internalPage, setInternalPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [containerWidth, setContainerWidth] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const currentPage = page ?? internalPage;

	/**
	 * The page is re-fitted whenever the container changes width: on a window
	 * resize, and also when a vertical scrollbar appears and steals a few pixels,
	 * which is what used to push the canvas into a horizontal scroll.
	 */
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver(([entry]) => {
			setContainerWidth(entry.contentRect.width);
		});

		observer.observe(container);

		return () => observer.disconnect();
	}, []);

	const goToPage = (next: number) => {
		if (onPageChange) {
			onPageChange(next);
		} else {
			setInternalPage(next);
		}
	};

	useEffect(() => {
		let isActive = true;
		let loadingTask: { destroy: () => Promise<void> } | null = null;

		async function render() {
			// Nothing to fit into yet; the observer will trigger this again.
			if (containerWidth <= 0) return;

			setIsLoading(true);
			setError(null);

			try {
				// pdf.js only runs in the browser, so it is loaded on demand.
				const pdfjs = await import('pdfjs-dist');
				// Copied into public/ by scripts/copy-pdf-worker.js.
				pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

				const task = pdfjs.getDocument({ url });
				loadingTask = task;

				const pdf = await task.promise;

				if (!isActive) return;

				setTotalPages(pdf.numPages);

				const safePage = Math.min(Math.max(currentPage, 1), pdf.numPages);
				const pdfPage = await pdf.getPage(safePage);

				const canvas = canvasRef.current;
				const context = canvas?.getContext('2d');

				if (!isActive || !canvas || !context) return;

				// Fit the page to the container, then sharpen it for the screen.
				const baseViewport = pdfPage.getViewport({ scale: 1 });
				const viewport = pdfPage.getViewport({ scale: containerWidth / baseViewport.width });
				const pixelRatio = window.devicePixelRatio || 1;

				canvas.width = Math.floor(viewport.width * pixelRatio);
				canvas.height = Math.floor(viewport.height * pixelRatio);
				canvas.style.width = `${viewport.width}px`;
				canvas.style.height = `${viewport.height}px`;

				renderTaskRef.current?.cancel();
				const renderTask = pdfPage.render({
					canvas,
					canvasContext: context,
					viewport,
					transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
				});
				renderTaskRef.current = renderTask;

				await renderTask.promise;

				if (!isActive) return;

				onRendered?.({ width: viewport.width, height: viewport.height }, pdf.numPages);
				setIsLoading(false);
			} catch (renderError: any) {
				if (!isActive || renderError?.name === 'RenderingCancelledException') return;

				console.error('[pdf-viewer] Failed to render:', renderError);
				setError('No pudimos mostrar el documento.');
				setIsLoading(false);
			}
		}

		render();

		return () => {
			isActive = false;
			renderTaskRef.current?.cancel();
			// Tears down the worker this page spun up.
			loadingTask?.destroy();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [url, currentPage, containerWidth]);

	return (
		<div className={className}>
			<div ref={containerRef} className={cn('relative w-full', pageAreaClassName)}>
				{isLoading && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				)}
				{error ? (
					<p className="py-12 text-center text-sm text-destructive">{error}</p>
				) : (
					<div className="flex justify-center">
						<div className="relative inline-block max-w-full">
							<canvas ref={canvasRef} className="block max-w-full rounded border border-border" />
							{overlay}
						</div>
					</div>
				)}
			</div>

			{totalPages > 1 && (
				<div className="mt-3 flex items-center justify-center gap-3">
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-8 w-8"
						disabled={currentPage <= 1}
						onClick={() => goToPage(currentPage - 1)}
						aria-label="Página anterior"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-sm text-muted-foreground">
						Página {currentPage} de {totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-8 w-8"
						disabled={currentPage >= totalPages}
						onClick={() => goToPage(currentPage + 1)}
						aria-label="Página siguiente"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
