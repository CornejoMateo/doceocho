'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { generateChecklistPDF } from '@/lib/checklists/checklist-pdf';
import type { Checklist, ChecklistItem } from '@/lib/checklists/checklists';
import { getWorkById } from '@/lib/works/works';

type ChecklistPDFButtonProps = {
	checklists: Checklist[];
	checklistItems?: Record<number, ChecklistItem[]>;
	workId?: number;
	workLocality?: string;
	workAddress?: string;
	clientName?: string;
	disabled?: boolean;
};

export function ChecklistPDFButton({
	checklists,
	checklistItems,
	workId,
	clientName,
	disabled,
}: ChecklistPDFButtonProps) {
	const [isGenerating, setIsGenerating] = useState(false);

	const handleDownloadPDF = async () => {
		if (checklists.length === 0) {
			return;
		}

		try {
			setIsGenerating(true);

			const { data: work } = await getWorkById(workId || -1);
			const workLocality = work?.locality || '';
			const workAddress = work?.address || '';

			await generateChecklistPDF(checklists, clientName, workLocality, workAddress, checklistItems);
		} catch (error) {
			console.error('Error generating PDF:', error);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<Button
			onClick={handleDownloadPDF}
			disabled={disabled || isGenerating || checklists.length === 0}
			variant="outline"
			className="w-full sm:w-auto"
		>
			{isGenerating ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Generando PDF...
				</>
			) : (
				<>
					<Download className="mr-2 h-4 w-4" />
					Descargar PDF
				</>
			)}
		</Button>
	);
}
