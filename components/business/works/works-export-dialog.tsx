'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import {
	DEFAULT_WORK_COLUMN_KEYS,
	WORK_COLUMNS,
	WORK_COLUMN_KEYS,
} from '@/helpers/works/works-columns';
import {
	buildWorksCsv,
	buildWorksPdfDocument,
	resolveOrientation,
	type OrientationChoice,
} from '@/helpers/works/works-export';
import type { WorkWithProgress } from '@/lib/works/works';
import { downloadCsv } from '@/utils/download-file';
import { exportFilename } from '@/utils/export-filename';
import { parseStoredKeys } from '@/utils/export-columns';

const STORAGE_KEY = 'works-export-columns';
/** Above this many columns a portrait page gets cramped. */
const WIDE_TABLE_COLUMNS = 8;
const HINT_ID = 'works-export-hint';

function loadKeys(): string[] {
	try {
		return parseStoredKeys(
			window.localStorage.getItem(STORAGE_KEY),
			WORK_COLUMN_KEYS,
			DEFAULT_WORK_COLUMN_KEYS
		);
	} catch {
		return DEFAULT_WORK_COLUMN_KEYS;
	}
}

interface WorksExportDialogProps {
	/** Every work passing the shared filters, in on-screen order. */
	works: WorkWithProgress[];
	totalWorks: number;
	filtersDescription: string[];
}

export function WorksExportDialog({
	works,
	totalWorks,
	filtersDescription,
}: WorksExportDialogProps) {
	const [open, setOpen] = useState(false);
	const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
	const [keys, setKeys] = useState<string[]>(DEFAULT_WORK_COLUMN_KEYS);
	const [orientation, setOrientation] = useState<OrientationChoice>('auto');
	const [exporting, setExporting] = useState(false);
	const submitting = useRef(false); // synchronous guard: state updates lag behind a double click
	const empty = works.length === 0;

	// Read the saved selection on the client only (avoids a hydration mismatch), every time it opens.
	useEffect(() => {
		if (open) setKeys(loadKeys());
	}, [open]);

	const toggle = (key: string, on: boolean) =>
		setKeys((prev) => (on ? [...prev, key] : prev.filter((k) => k !== key)));

	const selectedCount = WORK_COLUMNS.filter((c) => keys.includes(c.key)).length;
	const effectiveOrientation = resolveOrientation(orientation, selectedCount);

	const persist = () => {
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
		} catch {
			// Storage can be unavailable (private mode, quota): the selection just is not remembered.
		}
	};

	const submit = async () => {
		if (submitting.current || empty || selectedCount === 0) return;
		submitting.current = true;
		setExporting(true);
		try {
			persist();
			if (format === 'csv') {
				downloadCsv(buildWorksCsv(works, keys), exportFilename('obras', 'csv'));
			} else {
				// Lazy: keeps jsPDF out of the initial bundle (and out of jsdom tests).
				const { generatePdf } = await import('@/helpers/pdf/generate-pdf');
				await generatePdf(
					buildWorksPdfDocument(works, keys, { orientation, filtersDescription, totalWorks })
				);
			}
			toast({ title: format === 'csv' ? 'CSV generado' : 'PDF generado' });
			setOpen(false);
		} catch (error) {
			console.error('Error exporting works', error);
			toast({ variant: 'destructive', title: 'No se pudo exportar las obras' });
		} finally {
			submitting.current = false;
			setExporting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className="shrink-0"
					disabled={empty}
					aria-describedby={empty ? HINT_ID : undefined}
				>
					<Download className="h-4 w-4 sm:mr-2" aria-hidden />
					<span className="hidden sm:inline">Exportar</span>
					<span className="sr-only sm:hidden">Exportar obras</span>
				</Button>
			</DialogTrigger>
			{empty && (
				<span id={HINT_ID} className="sr-only">
					No hay obras para exportar con estos filtros.
				</span>
			)}
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Exportar obras</DialogTitle>
					<DialogDescription>
						Se exportan las {works.length} {works.length === 1 ? 'obra' : 'obras'} que coinciden con
						los filtros, no solo las de la página actual.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-5">
					<fieldset className="space-y-2">
						<legend className="text-sm font-medium">Formato</legend>
						<RadioGroup
							value={format}
							onValueChange={(v) => setFormat(v as 'csv' | 'pdf')}
							className="flex gap-6"
						>
							<div className="flex items-center gap-2">
								<RadioGroupItem value="csv" id="works-export-csv" />
								<Label htmlFor="works-export-csv">CSV (Excel, separado por ;)</Label>
							</div>
							<div className="flex items-center gap-2">
								<RadioGroupItem value="pdf" id="works-export-pdf" />
								<Label htmlFor="works-export-pdf">PDF</Label>
							</div>
						</RadioGroup>
					</fieldset>

					<fieldset className="space-y-2">
						<div className="flex items-center justify-between">
							<legend className="text-sm font-medium">Columnas ({selectedCount})</legend>
							<div className="flex gap-1">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 px-2"
									onClick={() => setKeys(WORK_COLUMN_KEYS)}
								>
									Todas
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 px-2"
									onClick={() => setKeys([])}
								>
									Ninguna
								</Button>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							{WORK_COLUMNS.map((c) => (
								<div key={c.key} className="flex items-center gap-2">
									<Checkbox
										id={`works-export-col-${c.key}`}
										checked={keys.includes(c.key)}
										onCheckedChange={(on) => toggle(c.key, on === true)}
									/>
									<Label htmlFor={`works-export-col-${c.key}`} className="font-normal">
										{c.label}
									</Label>
								</div>
							))}
						</div>
						{selectedCount === 0 && (
							<p role="alert" className="text-xs text-destructive">
								Elegí al menos una columna.
							</p>
						)}
					</fieldset>

					{format === 'pdf' && (
						<fieldset className="space-y-2">
							<legend className="text-sm font-medium">Orientación del PDF</legend>
							<RadioGroup
								value={orientation}
								onValueChange={(v) => setOrientation(v as OrientationChoice)}
								className="flex flex-wrap gap-x-6 gap-y-2"
							>
								{(
									[
										[
											'auto',
											`Automática (${effectiveOrientation === 'landscape' ? 'horizontal' : 'vertical'})`,
										],
										['portrait', 'Vertical'],
										['landscape', 'Horizontal'],
									] as const
								).map(([value, label]) => (
									<div key={value} className="flex items-center gap-2">
										<RadioGroupItem value={value} id={`works-export-or-${value}`} />
										<Label htmlFor={`works-export-or-${value}`} className="font-normal">
											{label}
										</Label>
									</div>
								))}
							</RadioGroup>
						</fieldset>
					)}

					{format === 'pdf' && orientation === 'portrait' && selectedCount > WIDE_TABLE_COLUMNS && (
						<p
							role="status"
							className="flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-400"
						>
							Con tantas columnas conviene Horizontal.
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="h-7 px-2"
								onClick={() => setOrientation('landscape')}
							>
								Usar Horizontal
							</Button>
						</p>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setOpen(false)}>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={submit}
						disabled={exporting || empty || selectedCount === 0}
						aria-busy={exporting}
					>
						{exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
						{exporting ? 'Exportando...' : 'Exportar'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
