import { getSupabaseClient } from '@/lib/supabase-client';
import type { SignatureStatus } from '@/constants/budgets/signatures';
import type { SignaturePlacement } from '@/helpers/budgets/signature-position';

const TABLE = 'budget_signatures';
const BUCKET = 'clients';

export type BudgetSignature = {
	id: number;
	created_at: string;
	updated_at: string;
	budget_id: number;
	public_token: string;
	document_path: string;
	page_number: number;
	position_x: number;
	position_y: number;
	width: number;
	height: number;
	status: SignatureStatus;
	signer_name: string | null;
	signed_document_path: string | null;
	signed_at: string | null;
	expires_at: string | null;
	created_by: string | null;
};

export type CreateSignatureInput = {
	budgetId: number;
	documentPath: string;
	placement: SignaturePlacement;
	expiresAt?: string | null;
	createdBy?: string | null;
};

/** Budget PDFs live under `${clientId}/...`, and signatures stay alongside. */
export function getClientFolder(documentPath: string): string {
	return documentPath.split('/')[0] ?? '';
}

export async function getSignatureByBudgetId(
	budgetId: number
): Promise<{ data: BudgetSignature | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.select('*')
		.eq('budget_id', budgetId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	return { data, error };
}

export async function createSignatureRequest(
	input: CreateSignatureInput
): Promise<{ data: BudgetSignature | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.insert({
			budget_id: input.budgetId,
			document_path: input.documentPath,
			page_number: input.placement.pageNumber,
			position_x: input.placement.x,
			position_y: input.placement.y,
			width: input.placement.width,
			height: input.placement.height,
			expires_at: input.expiresAt ?? null,
			created_by: input.createdBy ?? null,
			status: 'Pendiente',
		})
		.select()
		.single();

	return { data, error };
}

/** Frees the budget so a new link can be created. */
export async function cancelSignatureRequest(
	signatureId: number
): Promise<{ data: BudgetSignature | null; error: any }> {
	const supabase = getSupabaseClient();

	const { data, error } = await supabase
		.from(TABLE)
		.update({ status: 'Cancelado' })
		.eq('id', signatureId)
		.select()
		.single();

	return { data, error };
}

/** Uploads a document to sign when the budget has no PDF, or a different one is needed. */
export async function uploadSignatureDocument(
	clientId: number,
	file: File
): Promise<{ path: string | null; error: any }> {
	const supabase = getSupabaseClient();

	const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	const path = `${clientId}/signatures/source_${uniqueSuffix}.pdf`;

	const { error } = await supabase.storage.from(BUCKET).upload(path, file);

	if (error) {
		return { path: null, error };
	}

	return { path, error: null };
}

export async function getDocumentUrl(path: string): Promise<string | null> {
	const supabase = getSupabaseClient();

	const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);

	return data?.signedUrl ?? null;
}
