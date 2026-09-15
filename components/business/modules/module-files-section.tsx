'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ModuleFileWithUrl } from '@/hooks/modules/use-module-details-files';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import {
	ModuleFileItem,
	ModuleReviewPanelState,
	ModuleCorrectionPanelState,
} from './module-file-item';

interface ModuleFilesSectionProps {
	error: string | null;
	isLoading: boolean;
	files: ModuleFileWithUrl[];
	canReview: boolean;
	hasAdminResponded: boolean;
	onOpenViewer: (index: number) => void;
	onDownload: (file: ModuleFileWithUrl) => void;
	onRetry: () => void;
	review: ModuleReviewPanelState;
	correction: ModuleCorrectionPanelState;
}

export function ModuleFilesSection({
	error,
	isLoading,
	files,
	canReview,
	hasAdminResponded,
	onOpenViewer,
	onDownload,
	onRetry,
	review,
	correction,
}: ModuleFilesSectionProps) {
	return (
		<>
			<h4 className="text-sm font-medium text-foreground">Archivos ({files.length})</h4>

			{error && (
				<Alert variant="destructive" className="flex-1 min-w-0">
					<AlertCircle className="h-4 w-4" />
					<div className="flex items-start justify-between gap-2 min-w-0 flex-1">
						<div className="min-w-0">
							<AlertTitle>Error cargando algunos archivos</AlertTitle>
							<AlertDescription className="whitespace-pre-wrap break-words">
								{error}
							</AlertDescription>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="shrink-0"
							onClick={onRetry}
						>
							<RotateCcw className="h-3.5 w-3.5 mr-1" />
							Reintentar
						</Button>
					</div>
				</Alert>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center py-6">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : files.length === 0 ? (
				<p className="text-sm text-muted-foreground py-4">Este módulo no tiene archivos.</p>
			) : (
				<div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh]">
					{files.map((file, index) => (
						<ModuleFileItem
							key={file.id}
							file={file}
							index={index}
							canReview={canReview}
							hasAdminResponded={hasAdminResponded}
							onOpenViewer={onOpenViewer}
							onDownload={onDownload}
							review={review}
							correction={correction}
						/>
					))}
				</div>
			)}
		</>
	);
}
