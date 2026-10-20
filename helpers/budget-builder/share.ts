import type {
	Budget,
	CompanyInfo,
	FurnitureDimensions,
	FurnitureShape,
} from '@/lib/budget-builder/types';
import { budgetCode, calculateBudget } from '@/helpers/budget-builder/calculate';

/**
 * What the client gets. Only final prices: never internal costs, lines or margin.
 * It travels inside the link itself, so the MVP needs no database to share a budget.
 */
export type ClientBudget = {
	code: string;
	createdAt: string;
	validityDays: number;
	clientName: string;
	notes: string;
	company: CompanyInfo;
	items: {
		name: string;
		shape: FurnitureShape;
		dimensions: FurnitureDimensions;
		finish: string;
		units: number;
		notes: string;
		price: number;
	}[];
	total: number;
};

export function toClientBudget(budget: Budget, company: CompanyInfo): ClientBudget {
	const totals = calculateBudget(budget);

	return {
		code: budgetCode(budget),
		createdAt: budget.createdAt,
		validityDays: budget.validityDays,
		clientName: budget.clientName,
		notes: budget.notes,
		company,
		items: totals.items.map(({ item, price }) => ({
			name: item.name,
			shape: item.shape,
			dimensions: item.dimensions,
			finish: item.finish,
			units: item.units,
			notes: item.notes,
			price,
		})),
		total: totals.total,
	};
}

const COMPRESSED = 'z';
const PLAIN = 'p';

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
	const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
	const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
	return new Uint8Array(await new Response(output).arrayBuffer());
}

/** Compressed when the browser can, which keeps links short enough for WhatsApp. */
export async function encodeClientBudget(data: ClientBudget): Promise<string> {
	const bytes = new TextEncoder().encode(JSON.stringify(data));

	if (typeof CompressionStream === 'undefined') return PLAIN + toBase64Url(bytes);

	return COMPRESSED + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
}

export async function decodeClientBudget(token: string): Promise<ClientBudget | null> {
	try {
		const mode = token[0];
		const bytes = fromBase64Url(token.slice(1));
		const json =
			mode === COMPRESSED
				? await pipe(bytes, new DecompressionStream('deflate-raw'))
				: mode === PLAIN
					? bytes
					: null;

		if (!json) return null;

		const data = JSON.parse(new TextDecoder().decode(json)) as ClientBudget;
		return Array.isArray(data?.items) ? data : null;
	} catch {
		return null;
	}
}
