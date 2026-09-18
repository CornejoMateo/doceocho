import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/get-service-role-client';
import { decodeSignatureDataUrl, stampSignature } from '@/lib/budgets/stamp-signature';
import { MAX_SIGNATURE_IMAGE_BYTES } from '@/constants/budgets/signatures';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'clients';
const MAX_SIGNER_NAME_LENGTH = 120;

type SignBody = {
	signerName?: string;
	signatureImage?: string;
};

/** Receives the drawn signature, stamps it into the PDF and stores the result. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
	try {
		const { token } = await params;

		if (!UUID_REGEX.test(token)) {
			return NextResponse.json({ error: 'Enlace inválido' }, { status: 400 });
		}

		const body = (await req.json()) as SignBody;
		const signerName = body.signerName?.trim() ?? '';

		if (!signerName || signerName.length > MAX_SIGNER_NAME_LENGTH) {
			return NextResponse.json({ error: 'Necesitamos tu nombre y apellido' }, { status: 400 });
		}

		if (!body.signatureImage) {
			return NextResponse.json({ error: 'Falta la firma' }, { status: 400 });
		}

		if (body.signatureImage.length > MAX_SIGNATURE_IMAGE_BYTES) {
			return NextResponse.json({ error: 'La firma es demasiado grande' }, { status: 413 });
		}

		const signaturePng = decodeSignatureDataUrl(body.signatureImage);

		if (!signaturePng) {
			return NextResponse.json({ error: 'La firma no es válida' }, { status: 400 });
		}

		const supabase = getServiceRoleClient();

		const { data: signature, error } = await supabase
			.from('budget_signatures')
			.select('*')
			.eq('public_token', token)
			.maybeSingle();

		if (error || !signature) {
			return NextResponse.json({ error: 'No encontramos ese presupuesto' }, { status: 404 });
		}

		// A document is signed once: a second attempt must not overwrite the first.
		if (signature.status !== 'Pendiente') {
			return NextResponse.json(
				{ error: 'Este presupuesto ya fue firmado o el enlace fue dado de baja' },
				{ status: 409 }
			);
		}

		if (signature.expires_at && new Date(signature.expires_at).getTime() < Date.now()) {
			return NextResponse.json({ error: 'El enlace venció' }, { status: 410 });
		}

		const { data: file, error: downloadError } = await supabase.storage
			.from(BUCKET)
			.download(signature.document_path);

		if (downloadError || !file) {
			return NextResponse.json({ error: 'No pudimos abrir el documento' }, { status: 500 });
		}

		const signedPdf = await stampSignature(await file.arrayBuffer(), signaturePng, {
			pageNumber: signature.page_number,
			x: Number(signature.position_x),
			y: Number(signature.position_y),
			width: Number(signature.width),
			height: Number(signature.height),
		});

		const clientFolder = signature.document_path.split('/')[0];
		const signedPath = `${clientFolder}/signatures/signed_${token}.pdf`;

		const { error: uploadError } = await supabase.storage
			.from(BUCKET)
			.upload(signedPath, signedPdf, { contentType: 'application/pdf', upsert: true });

		if (uploadError) {
			console.error('[budget-signatures] Failed to store the signed PDF:', uploadError);
			return NextResponse.json({ error: 'No pudimos guardar la firma' }, { status: 500 });
		}

		// Guarded on the status so two submits at once cannot both win.
		const { data: updated, error: updateError } = await supabase
			.from('budget_signatures')
			.update({
				status: 'Firmado',
				signer_name: signerName,
				signed_document_path: signedPath,
				signed_at: new Date().toISOString(),
			})
			.eq('id', signature.id)
			.eq('status', 'Pendiente')
			.select('id')
			.maybeSingle();

		if (updateError || !updated) {
			return NextResponse.json({ error: 'Este presupuesto ya fue firmado' }, { status: 409 });
		}

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('[budget-signatures] Failed to sign:', error);

		return NextResponse.json({ error: 'Error al firmar el presupuesto' }, { status: 500 });
	}
}
