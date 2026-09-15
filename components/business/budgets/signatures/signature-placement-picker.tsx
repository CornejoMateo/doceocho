'use client';

import { useRef, useState } from 'react';
import { PdfPageViewer } from '@/components/ui/pdf-page-viewer';
import {
	PixelRect,
	SignaturePlacement,
	toPixelRect,
	toPlacement,
} from '@/helpers/budgets/signature-position';
import { DEFAULT_SIGNATURE_HEIGHT, DEFAULT_SIGNATURE_WIDTH } from '@/constants/budgets/signatures';

interface SignaturePlacementPickerProps {
	documentUrl: string;
	placement: SignaturePlacement | null;
	onPlacementChange: (placement: SignaturePlacement) => void;
}

/** Lets the admin drag the box where the client will sign, right on the page. */
export function SignaturePlacementPicker({
	documentUrl,
	placement,
	onPlacementChange,
}: SignaturePlacementPickerProps) {
	const [page, setPage] = useState(placement?.pageNumber ?? 1);
	const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });
	const [draftRect, setDraftRect] = useState<PixelRect | null>(null);
	const dragStartRef = useRef<{ x: number; y: number } | null>(null);

	// The box belongs to the page it was drawn on.
	const visibleRect =
		draftRect ??
		(placement && placement.pageNumber === page && renderedSize.width > 0
			? toPixelRect(placement, renderedSize.width, renderedSize.height)
			: null);

	const getPoint = (event: React.PointerEvent<HTMLDivElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();

		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	};

	const buildRect = (
		start: { x: number; y: number },
		end: { x: number; y: number }
	): PixelRect => ({
		x: Math.min(start.x, end.x),
		y: Math.min(start.y, end.y),
		width: Math.abs(end.x - start.x),
		height: Math.abs(end.y - start.y),
	});

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		event.currentTarget.setPointerCapture(event.pointerId);
		dragStartRef.current = getPoint(event);
		setDraftRect(null);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!dragStartRef.current) return;

		setDraftRect(buildRect(dragStartRef.current, getPoint(event)));
	};

	const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
		const start = dragStartRef.current;
		dragStartRef.current = null;

		if (!start || renderedSize.width === 0) return;

		const end = getPoint(event);
		const dragged = buildRect(start, end);

		// A plain tap drops a default-sized box centred on that point.
		const isTap = dragged.width < 8 || dragged.height < 8;
		const rect: PixelRect = isTap
			? {
					width: DEFAULT_SIGNATURE_WIDTH * renderedSize.width,
					height: DEFAULT_SIGNATURE_HEIGHT * renderedSize.height,
					x: end.x - (DEFAULT_SIGNATURE_WIDTH * renderedSize.width) / 2,
					y: end.y - (DEFAULT_SIGNATURE_HEIGHT * renderedSize.height) / 2,
				}
			: dragged;

		setDraftRect(null);
		onPlacementChange(toPlacement(rect, renderedSize.width, renderedSize.height, page));
	};

	return (
		<div className="space-y-3">
			<p className="text-sm text-muted-foreground">
				Arrastrá sobre el documento para marcar dónde va la firma, o tocá un punto para ubicarla
				ahí.
			</p>

			<PdfPageViewer
				url={documentUrl}
				page={page}
				onPageChange={setPage}
				onRendered={(size) => setRenderedSize(size)}
				pageAreaClassName="max-h-[55vh] overflow-x-hidden overflow-y-auto rounded-lg border border-border p-2"
				overlay={
					<div
						className="absolute inset-0 cursor-crosshair"
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
					>
						{visibleRect && (
							<div
								className="pointer-events-none absolute flex items-center justify-center rounded border-2 border-dashed border-primary bg-primary/15"
								style={{
									left: visibleRect.x,
									top: visibleRect.y,
									width: visibleRect.width,
									height: visibleRect.height,
								}}
							>
								<span className="text-[11px] font-medium text-primary">Firma</span>
							</div>
						)}
					</div>
				}
			/>

			{placement ? (
				<p className="text-xs text-muted-foreground">
					Firma ubicada en la página {placement.pageNumber}.
				</p>
			) : (
				<p className="text-xs text-destructive">Todavía no marcaste dónde va la firma.</p>
			)}
		</div>
	);
}
