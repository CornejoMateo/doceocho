import { useCallback, useEffect, useRef, useState } from 'react';
import {
	EmployeeDocument,
	deleteEmployeeDocument,
	getEmployeeDocumentUrl,
	listEmployeeDocuments,
} from '@/lib/human-resources/employee-documents';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { getFileKind } from '@/utils/file-upload-utils';

export type EmployeeDocumentWithUrl = EmployeeDocument & {
	name: string;
	mimetype: string;
	url: string;
};

function resolveMimeType(document: EmployeeDocument, fileName: string): string {
	if (document.type) return document.type;

	const kind = getFileKind(fileName);

	if (kind === 'image') return 'image/*';
	if (kind === 'video') return 'video/*';

	return 'application/octet-stream';
}

export function useEmployeeDocuments(employeeId?: number, enabled = true) {
	const [documents, setDocuments] = useState<EmployeeDocumentWithUrl[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const loadRequestRef = useRef(0);

	const loadDocuments = useCallback(async () => {
		if (!employeeId) {
			setDocuments([]);
			return;
		}

		const requestId = ++loadRequestRef.current;
		setIsLoading(true);

		try {
			const { data, error } = await listEmployeeDocuments(employeeId);

			if (requestId !== loadRequestRef.current) return;

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al cargar documentos',
					description: translateError(error),
				});
				setDocuments([]);
				return;
			}

			// Signed URLs are generated from the metadata, the objects are never downloaded here.
			const documentsWithUrls = await Promise.all(
				(data ?? []).map(async (document) => {
					const url = await getEmployeeDocumentUrl(document.path);

					if (!url) return null;

					const name = document.path.split('/').pop() || 'documento';

					return {
						...document,
						name,
						mimetype: resolveMimeType(document, name),
						url,
					};
				})
			);

			if (requestId !== loadRequestRef.current) return;

			setDocuments(
				documentsWithUrls.filter(
					(document): document is EmployeeDocumentWithUrl => document !== null
				)
			);
		} finally {
			if (requestId === loadRequestRef.current) {
				setIsLoading(false);
			}
		}
	}, [employeeId]);

	const remove = useCallback(
		async (documentId: number) => {
			const { error } = await deleteEmployeeDocument(documentId);

			if (error) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar documento',
					description: translateError(error),
				});
				return false;
			}

			toast({
				title: 'Documento eliminado',
				description: 'El documento se eliminó correctamente.',
			});

			await loadDocuments();
			return true;
		},
		[loadDocuments]
	);

	useEffect(() => {
		if (!enabled) return;

		loadDocuments();

		// Invalidate in-flight loads on close/unmount
		return () => {
			loadRequestRef.current += 1;
		};
	}, [enabled, loadDocuments]);

	return { documents, isLoading, loadDocuments, remove };
}
