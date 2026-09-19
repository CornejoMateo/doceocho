'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Copy, Download, PenLine, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { BudgetWithWork } from '@/lib/balances/balances';
import {
	BudgetSignature,
	cancelSignatureRequest,
	getDocumentUrl,
	getSignatureByBudgetId,
} from '@/lib/budgets/budget-signatures';
import { SIGNATURE_STATUS_VARIANTS, SIGNING_PATH } from '@/constants/budgets/signatures';
import { formatCreatedAt } from '@/utils/format-date';
import { SignatureRequestDialog } from '@/components/business/budgets/signatures/signature-request-dialog';

interface BudgetSignatureSectionProps {
	budget: BudgetWithWork | null;
	clientId: number;
}

export function BudgetSignatureSection({ budget, clientId }: BudgetSignatureSectionProps) {
	const [signature, setSignature] = useState<BudgetSignature | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isRequestOpen, setIsRequestOpen] = useState(false);
	const [isCancelOpen, setIsCancelOpen] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);

	const loadSignature = useCallback(async () => {
		if (!budget) return;

		setIsLoading(true);

		const { data } = await getSignatureByBudgetId(budget.id);
		setSignature(data);
		setIsLoading(false);
	}, [budget]);

	useEffect(() => {
		loadSignature();
	}, [loadSignature]);

	if (!budget) return null;

	const isPending = signature?.status === 'Pendiente';
	const isSigned = signature?.status === 'Firmado';

	const signingUrl =
		signature && typeof window !== 'undefined'
			? `${window.location.origin}${SIGNING_PATH}/${signature.public_token}`
			: '';

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(signingUrl);
			toast({
				title: 'Enlace copiado',
				description: 'Ya se lo podés mandar al cliente.',
			});
		} catch {
			toast({
				variant: 'destructive',
				title: 'No se pudo copiar',
				description: 'Copialo a mano desde el campo de texto.',
			});
		}
	};

	const handleDownloadSigned = async () => {
		if (!signature?.signed_document_path) return;

		const url = await getDocumentUrl(signature.signed_document_path);

		if (!url) {
			toast({
				variant: 'destructive',
				title: 'No se pudo abrir el archivo',
				description: 'Intentá de nuevo en unos segundos.',
			});
			return;
		}

		window.open(url, '_blank', 'noopener,noreferrer');
	};

	const handleCancel = async () => {
		if (!signature) return;

		setIsCancelling(true);

		try {
			const { error } = await cancelSignatureRequest(signature.id);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al dar de baja el enlace',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: 'Enlace dado de baja',
				description: 'Ese enlace ya no sirve para firmar.',
			});

			setIsCancelOpen(false);
			await loadSignature();
		} finally {
			setIsCancelling(false);
		}
	};

	return (
		<div className="space-y-3 rounded-lg border border-border p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<PenLine className="h-4 w-4 text-muted-foreground" />
					<h4 className="text-sm font-medium text-foreground">Firma digital</h4>
				</div>
				{signature && (
					<Badge variant={SIGNATURE_STATUS_VARIANTS[signature.status]}>{signature.status}</Badge>
				)}
			</div>

			{isLoading && <p className="text-xs text-muted-foreground">Cargando...</p>}

			{!isLoading && !isPending && !isSigned && (
				<>
					<p className="text-xs text-muted-foreground">
						Generá un enlace para que el cliente firme este presupuesto.
					</p>
					<Button size="sm" variant="outline" onClick={() => setIsRequestOpen(true)}>
						Enviar a firmar
					</Button>
				</>
			)}

			{!isLoading && isPending && (
				<>
					<p className="text-xs text-muted-foreground">
						Enlace activo. El cliente puede firmar desde acá.
					</p>
					<div className="flex gap-2">
						<Input readOnly value={signingUrl} className="h-8 bg-background text-xs" />
						<Button
							size="sm"
							variant="outline"
							onClick={handleCopyLink}
							className="flex-shrink-0 gap-2"
						>
							<Copy className="h-4 w-4" />
							<span className="hidden sm:inline">Copiar</span>
						</Button>
					</div>
					{signature?.expires_at && (
						<p className="text-xs text-muted-foreground">
							Vence el {formatCreatedAt(signature.expires_at)}.
						</p>
					)}
					<Button
						size="sm"
						variant="ghost"
						className="gap-2 text-muted-foreground hover:text-destructive"
						onClick={() => setIsCancelOpen(true)}
					>
						<X className="h-4 w-4" />
						Dar de baja el enlace
					</Button>
				</>
			)}

			{!isLoading && isSigned && (
				<>
					<p className="text-xs text-muted-foreground">
						Firmado por {signature?.signer_name}
						{signature?.signed_at ? ` el ${formatCreatedAt(signature.signed_at)}` : ''}.
					</p>
					<div className="flex flex-wrap gap-2">
						<Button size="sm" variant="outline" onClick={handleDownloadSigned} className="gap-2">
							<Download className="h-4 w-4" />
							Ver presupuesto firmado
						</Button>
						<Button size="sm" variant="ghost" onClick={() => setIsRequestOpen(true)}>
							Pedir una firma nueva
						</Button>
					</div>
				</>
			)}

			<SignatureRequestDialog
				budget={budget}
				clientId={clientId}
				open={isRequestOpen}
				onOpenChange={setIsRequestOpen}
				onCreated={loadSignature}
			/>

			<ConfirmDialog
				open={isCancelOpen}
				onOpenChange={setIsCancelOpen}
				title="Dar de baja el enlace"
				description="El cliente ya no va a poder firmar con ese enlace. Vas a poder generar uno nuevo."
				confirmText="Dar de baja"
				cancelText="Volver"
				onConfirm={handleCancel}
				isLoading={isCancelling}
			/>
		</div>
	);
}
