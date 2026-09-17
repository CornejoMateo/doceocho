'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface ModuleAdminResponseSectionProps {
	moduleReviewText: string;
	onModuleReviewTextChange: (value: string) => void;
	isSubmitting: boolean;
	allFilesReviewed: boolean;
	hasPendingReviews: boolean;
	hasAdminResponded: boolean;
	hasUnsyncedFileChanges: boolean;
	onSendResponse: () => void;
}

export function ModuleAdminResponseSection({
	moduleReviewText,
	onModuleReviewTextChange,
	isSubmitting,
	allFilesReviewed,
	hasPendingReviews,
	hasAdminResponded,
	hasUnsyncedFileChanges,
	onSendResponse,
}: ModuleAdminResponseSectionProps) {
	return (
		<div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 mt-2">
			<label htmlFor="module-review-text" className="text-sm font-medium text-foreground">
				Respuesta general del módulo +{' '}
			</label>{' '}
			<Textarea
				id="module-review-text"
				placeholder="Dejá una respuesta general para el dueño del módulo (opcional)"
				value={moduleReviewText}
				onChange={(e) => onModuleReviewTextChange(e.target.value)}
				disabled={isSubmitting}
				className="bg-background"
				rows={3}
			/>
			{!allFilesReviewed && (
				<p className="text-xs text-muted-foreground">
					Revisá todos los archivos (aprobar o rechazar) antes de poder enviar la respuesta.
				</p>
			)}
			{allFilesReviewed && hasPendingReviews && (
				<p className="text-xs text-muted-foreground">
					Esperando a que se confirmen las revisiones en curso...
				</p>
			)}
			{hasAdminResponded && !hasUnsyncedFileChanges && (
				<p className="text-xs text-muted-foreground">
					Ya se envió una respuesta para este módulo. Si volvés a enviarla, se reemplaza por la
					nueva.
				</p>
			)}
			{hasUnsyncedFileChanges && (
				<p className="text-xs font-medium text-destructive">
					Hay cambios sin enviar — el estado mostrado en otras vistas puede estar desactualizado
					hasta que reenvíes la respuesta.
				</p>
			)}
			<div className="flex justify-end">
				<Button
					type="button"
					size="sm"
					className="gap-1"
					onClick={onSendResponse}
					disabled={!allFilesReviewed || isSubmitting || hasPendingReviews}
				>
					{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
					{hasAdminResponded ? 'Reenviar respuesta' : 'Enviar respuesta'}
				</Button>
			</div>
		</div>
	);
}
