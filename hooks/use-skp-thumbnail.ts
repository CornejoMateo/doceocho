'use client';

import { useEffect, useRef, useState } from 'react';
import { extractSkpThumbnail } from '@/utils/skp-thumbnail';

// Avoid downloading huge files just to look for a thumbnail
const MAX_PREVIEW_DOWNLOAD_BYTES = 100 * 1024 * 1024;

// How far ahead of the viewport a thumbnail starts loading
const ROOT_MARGIN = '200px';

// Caps how many thumbnails extract concurrently across the whole app, shared by all hook instances
const MAX_CONCURRENT_EXTRACTIONS = 3;
let activeExtractions = 0;
const extractionQueue: Array<() => void> = [];

function acquireExtractionSlot(): Promise<() => void> {
	return new Promise((resolve) => {
		const grant = () => {
			activeExtractions++;
			let released = false;
			resolve(() => {
				if (released) return;
				released = true;
				activeExtractions--;
				const next = extractionQueue.shift();
				if (next) next();
			});
		};
		if (activeExtractions < MAX_CONCURRENT_EXTRACTIONS) grant();
		else extractionQueue.push(grant);
	});
}

/** Downloads a URL while streaming bytes, aborting as soon as the cap is exceeded. */
async function fetchWithCap(url: string, signal: AbortSignal): Promise<Blob | null> {
	const response = await fetch(url, { signal });
	if (!response.ok) return null;

	const contentLength = response.headers.get('content-length');
	if (contentLength && Number(contentLength) > MAX_PREVIEW_DOWNLOAD_BYTES) return null;

	const reader = response.body?.getReader();
	if (!reader) {
		// No streaming body available (e.g. some test/runtime environments): fall back to post-hoc check
		const blob = await response.blob();
		return blob.size > MAX_PREVIEW_DOWNLOAD_BYTES ? null : blob;
	}

	const chunks: Uint8Array[] = [];
	let received = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;
		received += value.byteLength;
		if (received > MAX_PREVIEW_DOWNLOAD_BYTES) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	return new Blob(chunks as BlobPart[]);
}

interface UseSkpThumbnailOptions {
	/** A File/Blob already in memory, or a URL (blob: or signed storage URL) fetched lazily. */
	source: File | Blob | string | null | undefined;
	/** Known file size in bytes, used to skip oversized downloads before fetching. */
	size?: number | null;
	/** Set to false to skip extraction (e.g. when the file isn't a .skp). */
	enabled?: boolean;
}

/** Extracts a .skp file's embedded thumbnail lazily and exposes it as an object URL. */
export function useSkpThumbnail({ source, size, enabled = true }: UseSkpThumbnailOptions) {
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const elementRef = useRef<HTMLSpanElement | null>(null);

	// Only start loading once the element (if any) is near the viewport. Falls back to loading
	// immediately when IntersectionObserver isn't available (jsdom) or no element was attached.
	useEffect(() => {
		if (!enabled || !source) return;

		if (typeof IntersectionObserver === 'undefined' || !elementRef.current) {
			setIsVisible(true);
			return;
		}

		const el = elementRef.current;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsVisible(true);
					observer.disconnect();
				}
			},
			{ rootMargin: ROOT_MARGIN }
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [enabled, source]);

	useEffect(() => {
		if (!enabled || !source || !isVisible) {
			setThumbnailUrl(null);
			return;
		}

		if (typeof source === 'string' && size != null && size > MAX_PREVIEW_DOWNLOAD_BYTES) {
			setThumbnailUrl(null);
			return;
		}

		let cancelled = false;
		let objectUrl: string | null = null;
		const controller = new AbortController();

		setThumbnailUrl(null);

		const run = async () => {
			setIsLoading(true);
			const release = await acquireExtractionSlot();
			try {
				if (cancelled) return;

				let payload: Blob | File;
				if (typeof source === 'string') {
					const downloaded = await fetchWithCap(source, controller.signal);
					if (cancelled || !downloaded) return;
					payload = downloaded;
				} else {
					payload = source;
				}

				const thumbnail = await extractSkpThumbnail(payload);
				if (cancelled || !thumbnail) return;

				objectUrl = URL.createObjectURL(thumbnail);
				setThumbnailUrl(objectUrl);
			} catch {
				// Keep the fallback icon on any failure (network, parsing, abort, etc.)
			} finally {
				release();
				if (!cancelled) setIsLoading(false);
			}
		};

		run();

		return () => {
			cancelled = true;
			controller.abort();
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [source, size, enabled, isVisible]);

	return { thumbnailUrl, isLoading, ref: elementRef };
}
