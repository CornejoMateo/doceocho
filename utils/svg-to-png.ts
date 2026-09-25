/** Converts an inline <svg> (e.g. a Recharts chart) to a PNG data URL, without html2canvas
 *
 * How: clone the svg, copy the *computed* paint/text styles of every node onto the clone as
 * inline styles with colors converted to concrete rgb()/rgba() (via a 1x1 canvas, which
 * understands modern color syntaxes), serialize it, load it as an image and draw it on a
 * white canvas at 2x. Dark-mode text/grid/slice-border colors are forced to print-friendly
 * values. Browser-only.
 */
export type LegendItem = { label: string; color: string };

export type SvgToPngOptions = {
	scale?: number;
	title?: string;
	legend?: LegendItem[];
	note?: string;
};

export type PngResult = {
	blob: Blob;
	width: number;
	height: number;
};

/** Browsers silently return an empty canvas ('data:,') beyond these limits. */
export const MAX_CANVAS_DIMENSION = 16000;
export const MAX_CANVAS_AREA = 16_000_000;
const MIN_SCALE = 0.25;
const IMAGE_TIMEOUT_MS = 10_000;

/** Largest scale (<= requested) that keeps the canvas within the browser limits. */
export function clampScale(width: number, height: number, requested: number): number {
	if (width <= 0 || height <= 0) return 0;
	return Math.min(
		requested,
		MAX_CANVAS_DIMENSION / Math.max(width, height),
		Math.sqrt(MAX_CANVAS_AREA / (width * height))
	);
}

const COPIED_PROPS = [
	'fill',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'fill-opacity',
	'opacity',
	'stroke-dasharray',
	'stroke-linecap',
	'stroke-linejoin',
	'font-family',
	'font-size',
	'font-weight',
	'font-style',
	'text-anchor',
	'dominant-baseline',
];
const COLOR_PROPS = new Set(['fill', 'stroke']);
const TEXT_COLOR = 'rgb(75, 85, 99)';
const GRID_COLOR = 'rgb(229, 231, 235)';

let colorCtx: CanvasRenderingContext2D | null | undefined;

/** Converts any CSS color the browser can parse to 'rgb(a)'; null when it cannot be parsed. */
export function toRgb(color: string): string | null {
	if (colorCtx === undefined) {
		const c = document.createElement('canvas');
		c.width = c.height = 1;
		colorCtx = c.getContext('2d', { willReadFrequently: true });
	}
	const ctx = colorCtx;
	if (!ctx) return null;
	const read = (sentinel: string) => {
		ctx.clearRect(0, 0, 1, 1);
		ctx.fillStyle = sentinel;
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 1, 1);
		return Array.from(ctx.getImageData(0, 0, 1, 1).data);
	};
	// Two different sentinels: if the color is unparsable both stay as the sentinel and differ.
	const a = read('#010203');
	const b = read('#fdfcfb');
	if (a.some((v, i) => v !== b[i])) return null;
	const [r, g, bl, al] = a;
	return al === 255
		? `rgb(${r}, ${g}, ${bl})`
		: `rgba(${r}, ${g}, ${bl}, ${+(al / 255).toFixed(3)})`;
}

/**
 * Resolves 'var(--x)' / oklch / color-mix into rgb, using `context` to resolve variables.
 * Returns null for invalid colors and for undefined variables (which would otherwise
 * silently inherit the parent's color).
 */
export function resolveColor(
	color: string,
	context: Element,
	cache?: Map<string, string | null>
): string | null {
	if (cache?.has(color)) return cache.get(color) ?? null;
	const result = resolveUncached(color, context);
	cache?.set(color, result);
	return result;
}

function resolveUncached(color: string, context: Element): string | null {
	const ctxStyle = getComputedStyle(context);
	for (const m of color.matchAll(/var\(\s*(--[\w-]+)/g)) {
		if (!ctxStyle.getPropertyValue(m[1]).trim()) return null;
	}
	const probe = document.createElement('span');
	probe.style.color = color;
	if (!probe.style.color) return null; // browser rejected the value
	probe.style.display = 'none';
	context.appendChild(probe);
	const computed = getComputedStyle(probe).color;
	probe.remove();
	return computed ? toRgb(computed) : null;
}

function isLight(rgb: string): boolean {
	const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
	if (!m) return false;
	return 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3] > 150;
}

function inlineStyles(
	source: Element,
	target: Element,
	root: Element,
	dark: boolean,
	cache: Map<string, string | null>
) {
	const cs = getComputedStyle(source);
	const tag = source.tagName.toLowerCase();
	const isText = tag === 'text' || tag === 'tspan';
	const cls = source.getAttribute('class') ?? '';
	let style = '';
	for (const prop of COPIED_PROPS) {
		let value = cs.getPropertyValue(prop);
		if (!value) continue;
		if (COLOR_PROPS.has(prop) && value !== 'none' && !value.startsWith('url(')) {
			const rgb = resolveColor(value, root, cache) ?? value;
			value = rgb;
			if (prop === 'fill' && isText && isLight(rgb)) value = TEXT_COLOR;
			if (dark && prop === 'stroke') {
				if (/recharts-cartesian-grid/.test(cls) || source.closest('.recharts-cartesian-grid'))
					value = GRID_COLOR;
				else if (/recharts-sector/.test(cls)) value = 'rgb(255, 255, 255)';
			}
		}
		style += `${prop}:${value};`;
	}
	target.setAttribute('style', style);
	const s = Array.from(source.children);
	const t = Array.from(target.children);
	s.forEach((child, i) => t[i] && inlineStyles(child, t[i], root, dark, cache));
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const timer = setTimeout(
			() => reject(new Error('Se agotó el tiempo al renderizar el gráfico')),
			IMAGE_TIMEOUT_MS
		);
		img.onload = () => {
			clearTimeout(timer);
			resolve(img);
		};
		img.onerror = () => {
			clearTimeout(timer);
			reject(new Error('No se pudo renderizar el SVG del gráfico'));
		};
		img.src = src;
	});
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export async function svgToPng(svg: SVGSVGElement, opts: SvgToPngOptions = {}): Promise<PngResult> {
	const requestedScale = opts.scale ?? 2;
	const colorCache = new Map<string, string | null>();
	const rect = svg.getBoundingClientRect();
	const w = Math.round(rect.width);
	const h = Math.round(rect.height);
	if (!w || !h) throw new Error('El gráfico no tiene tamaño visible');

	const dark = document.documentElement.classList.contains('dark');
	const clone = svg.cloneNode(true) as SVGSVGElement;
	inlineStyles(svg, clone, svg.parentElement ?? document.body, dark, colorCache);
	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clone.setAttribute('width', String(w));
	clone.setAttribute('height', String(h));
	if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
	clone.removeAttribute('class');
	// Fonts loaded by the page are not available inside an svg-as-image: use a safe stack.
	clone.querySelectorAll('[style*="font-family"]').forEach((el) => {
		(el as SVGElement).style.fontFamily = FONT;
	});

	const xml = new XMLSerializer().serializeToString(clone);
	const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`);

	// Layout: optional title above, optional legend (wrapped) below.
	const pad = 12;
	const titleH = opts.title ? 28 : 0;
	const measure = document.createElement('canvas').getContext('2d');
	if (!measure) throw new Error('Canvas no disponible');
	measure.font = `12px ${FONT}`;
	const legendRows: LegendItem[][] = [];
	if (opts.legend?.length) {
		let row: LegendItem[] = [];
		let x = 0;
		for (const item of opts.legend) {
			const itemW = 16 + measure.measureText(item.label).width + 14;
			if (row.length && x + itemW > w) {
				legendRows.push(row);
				row = [];
				x = 0;
			}
			row.push(item);
			x += itemW;
		}
		if (row.length) legendRows.push(row);
	}
	const legendH = legendRows.length ? legendRows.length * 20 + 8 : 0;
	const noteH = opts.note ? 22 : 0;
	const totalW = w + pad * 2;
	const totalH = titleH + h + legendH + noteH + pad * 2;
	const scale = clampScale(totalW, totalH, requestedScale);
	if (scale < MIN_SCALE)
		throw new Error('El gráfico es demasiado grande para exportarlo como imagen');

	const canvas = document.createElement('canvas');
	canvas.width = Math.round(totalW * scale);
	canvas.height = Math.round(totalH * scale);
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas no disponible');
	ctx.scale(scale, scale);
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, totalW, totalH);
	if (opts.title) {
		ctx.fillStyle = '#111827';
		ctx.font = `600 14px ${FONT}`;
		ctx.textBaseline = 'middle';
		ctx.fillText(opts.title, pad, pad + 10);
	}
	ctx.drawImage(img, pad, pad + titleH, w, h);
	ctx.font = `12px ${FONT}`;
	ctx.textBaseline = 'middle';
	legendRows.forEach((row, ri) => {
		let x = pad;
		const y = pad + titleH + h + 8 + ri * 20 + 10;
		for (const item of row) {
			ctx.fillStyle =
				resolveColor(item.color, svg.parentElement ?? document.body, colorCache) ?? '#888888';
			ctx.fillRect(x, y - 5, 10, 10);
			ctx.fillStyle = TEXT_COLOR;
			ctx.fillText(item.label, x + 16, y);
			x += 16 + ctx.measureText(item.label).width + 14;
		}
	});

	if (opts.note) {
		ctx.fillStyle = TEXT_COLOR;
		ctx.font = `italic 12px ${FONT}`;
		ctx.textBaseline = 'middle';
		ctx.fillText(opts.note, pad, pad + titleH + h + legendH + 12);
	}

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	if (!blob || blob.type !== 'image/png' || !(await hasPngSignature(blob)))
		throw new Error('El navegador no pudo generar la imagen del gráfico');
	return { blob, width: canvas.width, height: canvas.height };
}

async function hasPngSignature(blob: Blob): Promise<boolean> {
	const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
	return [0x89, 0x50, 0x4e, 0x47].every((b, i) => head[i] === b);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'));
		reader.readAsDataURL(blob);
	});
}

/** Finds the chart svg inside a container (ignores small icon svgs such as buttons' icons). */
export function findChartSvg(container: Element | null): SVGSVGElement | null {
	return container?.querySelector<SVGSVGElement>('svg.recharts-surface') ?? null;
}
