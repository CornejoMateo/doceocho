'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileWarning, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PdfPageViewer } from '@/components/ui/pdf-page-viewer';
import { SignaturePad, SignaturePadHandle } from '@/components/ui/signature-pad';
import {
	PublicSignatureRequest,
	fetchSignatureRequest,
	submitSignature,
} from '@/lib/budgets/public-signatures';
import { toPixelRect } from '@/helpers/budgets/signature-position';

export function SignBudget({ token }: { token: string }) {
	const signaturePadRef = useRef<SignaturePadHandle>(null);

	const [request, setRequest] = useState<PublicSignatureRequest | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [page, setPage] = useState(1);
	const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });
	const [signerName, setSignerName] = useState('');
	const [hasDrawing, setHasDrawing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [isSigned, setIsSigned] = useState(false);

	useEffect(() => {
		let isActive = true;

		fetchSignatureRequest(token).then(({ data, error }) => {
			if (!isActive) return;

			setRequest(data);
			setLoadError(error);
			setIsLoading(false);
			setIsSigned(data?.status === 'Firmado');

			if (data) setPage(data.placement.pageNumber);
		});

		return () => {
			isActive = false;
		};
	}, [token]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setFormError(null);

		if (!signerName.trim()) {
			setFormError('Necesitamos tu nombre y apellido.');
			return;
		}

		const signatureImage = signaturePadRef.current?.toDataUrl();

		if (!signatureImage) {
			setFormError('Dibujá tu firma antes de enviar.');
			return;
		}

		setIsSubmitting(true);

		const { error } = await submitSignature(token, signerName.trim(), signatureImage);

		setIsSubmitting(false);

		if (error) {
			setFormError(error);
			return;
		}

		setIsSigned(true);

		// Reload so the client sees the signed document, not the original.
		const { data } = await fetchSignatureRequest(token);
		if (data) setRequest(data);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (loadError || !request) {
		return (
			<Card className="space-y-2 p-6 text-center sm:p-8">
				<FileWarning className="mx-auto h-10 w-10 text-muted-foreground" />
				<h2 className="text-lg font-semibold text-foreground">No encontramos ese presupuesto</h2>
				<p className="text-sm text-muted-foreground">
					Revisá que el enlace esté completo o pedile uno nuevo a quien te lo envió.
				</p>
			</Card>
		);
	}

	if (request.status === 'Cancelado') {
		return (
			<Card className="space-y-2 p-6 text-center sm:p-8">
				<FileWarning className="mx-auto h-10 w-10 text-muted-foreground" />
				<h2 className="text-lg font-semibold text-foreground">Este enlace ya no está disponible</h2>
				<p className="text-sm text-muted-foreground">Pedile un enlace nuevo a quien te lo envió.</p>
			</Card>
		);
	}

	if (request.isExpired && !isSigned) {
		return (
			<Card className="space-y-2 p-6 text-center sm:p-8">
				<FileWarning className="mx-auto h-10 w-10 text-muted-foreground" />
				<h2 className="text-lg font-semibold text-foreground">El enlace venció</h2>
				<p className="text-sm text-muted-foreground">Pedile un enlace nuevo a quien te lo envió.</p>
			</Card>
		);
	}

	// Once signed, the document already carries the signature: nothing to mark.
	const signatureBox =
		!isSigned && request.placement.pageNumber === page && renderedSize.width > 0
			? toPixelRect(request.placement, renderedSize.width, renderedSize.height)
			: null;

	return (
		<div className="space-y-6">
			{isSigned && (
				<Card className="flex items-start gap-3 border-green-500/40 bg-green-500/10 p-4">
					<CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
					<div>
						<p className="text-sm font-medium text-foreground">¡Listo, ya está firmado!</p>
						<p className="text-sm text-muted-foreground">
							Abajo podés ver el presupuesto con tu firma. Guardalo si querés una copia.
						</p>
					</div>
				</Card>
			)}

			<Card className="p-3 sm:p-4">
				<PdfPageViewer
					url={request.documentUrl}
					page={page}
					onPageChange={setPage}
					onRendered={(size) => setRenderedSize(size)}
					pageAreaClassName="max-h-[60vh] overflow-x-hidden overflow-y-auto"
					overlay={
							signatureBox && (
								<div
									className="pointer-events-none absolute flex items-center justify-center rounded border-2 border-dashed border-primary bg-primary/10"
									style={{
										left: signatureBox.x,
										top: signatureBox.y,
										width: signatureBox.width,
										height: signatureBox.height,
									}}
								>
									<span className="text-[11px] font-medium text-primary">Acá va tu firma</span>
								</div>
							)
						}
					/>
			</Card>

			{!isSigned && (
				<Card className="p-4 sm:p-6">
					<h2 className="mb-1 font-semibold text-foreground">Tu firma</h2>
					<p className="mb-4 text-sm text-muted-foreground">
						Dibujá tu firma y tocá enviar. Se va a insertar en el recuadro marcado.
					</p>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid gap-2">
							<Label htmlFor="signer-name">Nombre y apellido *</Label>
							<Input
								id="signer-name"
								value={signerName}
								onChange={(event) => setSignerName(event.target.value)}
								disabled={isSubmitting}
								maxLength={120}
							/>
						</div>

						<SignaturePad
							ref={signaturePadRef}
							disabled={isSubmitting}
							onDrawingChange={setHasDrawing}
						/>

						{formError && <p className="text-sm text-destructive">{formError}</p>}

						<Button
							type="submit"
							className="w-full"
							disabled={isSubmitting || !hasDrawing || !signerName.trim()}
						>
							{isSubmitting ? 'Enviando...' : 'Firmar y enviar'}
						</Button>
						<p className="text-center text-xs text-muted-foreground">
							Al enviar, tu firma queda insertada en el presupuesto.
						</p>
					</form>
				</Card>
			)}
		</div>
	);
}
