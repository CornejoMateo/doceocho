import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/get-service-role-client';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'clients';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Everything the signing page needs, and nothing else: the document to sign,
 * where the signature goes, and the current status. No client data, no amounts,
 * no other budgets.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
	try {
		const { token } = await params;

		if (!UUID_REGEX.test(token)) {
			return NextResponse.json({ error: 'Enlace inválido' }, { status: 400 });
		}

		const supabase = getServiceRoleClient();

		const { data: signature, error } = await supabase
			.from('budget_signatures')
			.select(
				'status, document_path, signed_document_path, page_number, position_x, position_y, width, height, signer_name, signed_at, expires_at'
			)
			.eq('public_token', token)
			.maybeSingle();

		if (error || !signature) {
			return NextResponse.json({ error: 'No encontramos ese presupuesto' }, { status: 404 });
		}

		const isExpired = Boolean(
			signature.expires_at && new Date(signature.expires_at).getTime() < Date.now()
		);

		// Once signed, the client sees the signed copy instead of the original.
		const pathToShow =
			signature.status === 'Firmado' && signature.signed_document_path
				? signature.signed_document_path
				: signature.document_path;

		const { data: urlData } = await supabase.storage
			.from(BUCKET)
			.createSignedUrl(pathToShow, SIGNED_URL_TTL_SECONDS);

		if (!urlData?.signedUrl) {
			return NextResponse.json({ error: 'No pudimos abrir el documento' }, { status: 500 });
		}

		return NextResponse.json({
			status: signature.status,
			isExpired,
			documentUrl: urlData.signedUrl,
			placement: {
				pageNumber: signature.page_number,
				x: Number(signature.position_x),
				y: Number(signature.position_y),
				width: Number(signature.width),
				height: Number(signature.height),
			},
			signerName: signature.signer_name,
			signedAt: signature.signed_at,
		});
	} catch (error: any) {
		console.error('[budget-signatures] Failed to read the request:', error);

		return NextResponse.json({ error: 'Error al abrir el presupuesto' }, { status: 500 });
	}
}
