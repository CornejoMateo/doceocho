import type { SignatureStatus } from '@/constants/budgets/signatures';
import type { SignaturePlacement } from '@/helpers/budgets/signature-position';

export type PublicSignatureRequest = {
	status: SignatureStatus;
	isExpired: boolean;
	documentUrl: string;
	placement: SignaturePlacement;
	signerName: string | null;
	signedAt: string | null;
};

async function readError(response: Response, fallback: string): Promise<string> {
	try {
		const body = await response.json();
		return body?.error || fallback;
	} catch {
		return fallback;
	}
}

export async function fetchSignatureRequest(
	token: string
): Promise<{ data: PublicSignatureRequest | null; error: string | null }> {
	try {
		const response = await fetch(`/api/budget-signatures/${token}`);

		if (!response.ok) {
			return { data: null, error: await readError(response, 'No encontramos ese presupuesto') };
		}

		return { data: await response.json(), error: null };
	} catch {
		return { data: null, error: 'No encontramos ese presupuesto' };
	}
}

export async function submitSignature(
	token: string,
	signerName: string,
	signatureImage: string
): Promise<{ error: string | null }> {
	try {
		const response = await fetch(`/api/budget-signatures/${token}/sign`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ signerName, signatureImage }),
		});

		if (!response.ok) {
			return { error: await readError(response, 'No pudimos registrar tu firma') };
		}

		return { error: null };
	} catch {
		return { error: 'No pudimos registrar tu firma' };
	}
}
