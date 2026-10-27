'use client';

import { ReactNode, useState } from 'react';
import { useSkpThumbnail } from '@/hooks/use-skp-thumbnail';

interface SkpThumbnailProps {
	source: File | Blob | string | null | undefined;
	size?: number | null;
	alt: string;
	className?: string;
	fallback: ReactNode;
}

/** Renders a SketchUp model's embedded thumbnail when extractable, otherwise the given fallback. */
export function SkpThumbnail({ source, size, alt, className, fallback }: SkpThumbnailProps) {
	const { thumbnailUrl, ref } = useSkpThumbnail({ source, size });
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const showImage = !!thumbnailUrl && failedUrl !== thumbnailUrl;

	// display: contents keeps this wrapper out of layout while still giving the hook an
	// element to observe for viewport proximity.
	return (
		<span ref={ref} style={{ display: 'block', width: '100%', height: '100%' }}>
			{showImage && thumbnailUrl ? (
				<img
					src={thumbnailUrl}
					alt={alt}
					className={className}
					onError={() => setFailedUrl(thumbnailUrl)}
				/>
			) : (
				fallback
			)}
		</span>
	);
}
