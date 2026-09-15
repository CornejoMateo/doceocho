'use client';

import { useEffect, useRef, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import { translateError } from '@/lib/error-translator';
import { BudgetWithWork } from '@/lib/balances/balances';
import {
	createSignatureRequest,
	getDocumentUrl,
	uploadSignatureDocument,
} from '@/lib/budgets/budget-signatures';
import { SignaturePlacement } from '@/helpers/budgets/signature-position';
import { SIGNATURE_LINK_DAYS_VALID } from '@/constants/budgets/signatures';
import { SignaturePlacementPicker } from '@/components/business/budgets/signatures/signature-placement-picker';

interface SignatureRequestDialogProps {
	budget: BudgetWithWork | null;
	clientId: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: () => void;
}

export function SignatureRequestDialog({
	budget,
	clientId,
	open,
	onOpenChange,
	onCreated,
}: SignatureRequestDialogProps) {
	const { toast } = useToast();
	const { user } = useAuth();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [documentPath, setDocumentPath] = useState<string | null>(null);
	const [documentUrl, setDocumentUrl] = useState<string | null>(null);
	const [placement, setPlacement] = useState<SignaturePlacement | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// Starts from the budget's own PDF whenever it has one.
	useEffect(() => {
		if (!open) {
			setDocumentPath(null);
			setDocumentUrl(null);
			setPlacement(null);
			return;
		}

		const path = budget?.pdf_path ?? null;
		setDocumentPath(path);
		setPlacement(null);

		if (path) {
			getDocumentUrl(path).then(setDocumentUrl);
		} else {
			setDocumentUrl(null);
		}
	}, [open, budget]);

	const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (file.type !== 'application/pdf') {
			toast({
				variant: 'destructive',
				title: 'Formato no válido',
				description: 'Por ahora solo se pueden firmar archivos PDF.',
			});
			event.target.value = '';
			return;
		}

		setIsUploading(true);

		try {
			const { path, error } = await uploadSignatureDocument(clientId, file);

			if (error || !path) {
				toast({
					variant: 'destructive',
					title: 'Error al subir el documento',
					description: translateError(error),
				});
				return;
			}

			setDocumentPath(path);
			setPlacement(null);
			setDocumentUrl(await getDocumentUrl(path));
		} finally {
			setIsUploading(false);
			event.target.value = '';
		}
	};

	const handleCreate = async () => {
		if (!budget || !documentPath || !placement) return;

		setIsSaving(true);

		try {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + SIGNATURE_LINK_DAYS_VALID);

			const { error } = await createSignatureRequest({
				budgetId: budget.id,
				documentPath,
				placement,
				expiresAt: expiresAt.toISOString(),
				createdBy: user?.uid ?? null,
			});

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al generar el enlace',
					description: translateError(error),
				});
				return;
			}

			toast({
				title: 'Enlace generado',
				description: 'Ya podés enviárselo al cliente para que lo firme.',
			});

			onOpenChange(false);
			onCreated();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-3xl max-h-[95dvh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Enviar a firmar</DialogTitle>
					<DialogDescription>
						Marcá dónde tiene que firmar el cliente y generá el enlace.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="min-w-0">
							<Label className="text-sm">Documento</Label>
							<p className="text-xs text-muted-foreground truncate">
								{documentPath
									? documentPath.split('/').pop()
									: 'Este presupuesto no tiene PDF cargado.'}
							</p>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/pdf"
							className="hidden"
							onChange={handleFileSelect}
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="gap-2 flex-shrink-0"
							onClick={() => fileInputRef.current?.click()}
							disabled={isUploading || isSaving}
						>
							<Upload className="h-4 w-4" />
							{isUploading ? 'Subiendo...' : documentPath ? 'Usar otro PDF' : 'Subir PDF'}
						</Button>
					</div>

					{documentUrl ? (
						<SignaturePlacementPicker
							documentUrl={documentUrl}
							placement={placement}
							onPlacementChange={setPlacement}
						/>
					) : (
						<p className="py-10 text-center text-sm text-muted-foreground">
							Subí un PDF para marcar dónde va la firma.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
						Cancelar
					</Button>
					<Button onClick={handleCreate} disabled={isSaving || !documentPath || !placement}>
						{isSaving ? 'Generando...' : 'Generar enlace'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
