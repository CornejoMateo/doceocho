'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { exportFilename, type Table } from '@/helpers/works/metrics-export';
import { buildCsv } from '@/utils/csv';
import { downloadBlob, downloadCsv } from '@/utils/download-file';
import { findChartSvg, svgToPng, type LegendItem } from '@/utils/svg-to-png';

interface ChartExportMenuProps {
	title: string;
	filenameBase: string;
	getContainer: () => Element | null;
	legend?: LegendItem[];
	note?: string;
	table: Table;
}

export function ChartExportMenu({
	title,
	filenameBase,
	getContainer,
	legend,
	note,
	table,
}: ChartExportMenuProps) {
	const exportPng = async () => {
		const svg = findChartSvg(getContainer());
		if (!svg) {
			toast({ title: 'No hay gráfico para exportar', variant: 'destructive' });
			return;
		}
		try {
			const png = await svgToPng(svg, { title, legend, note });
			downloadBlob(png.blob, exportFilename(filenameBase, 'png'));
		} catch (e) {
			toast({
				title: 'No se pudo exportar el gráfico',
				description: e instanceof Error ? e.message : undefined,
				variant: 'destructive',
			});
		}
	};

	const exportCsv = () => {
		if (table.rows.length === 0) {
			toast({ title: 'No hay datos para exportar', variant: 'destructive' });
			return;
		}
		downloadCsv(buildCsv(table.headers, table.rows), exportFilename(filenameBase, 'csv'));
	};

	return (
		<div data-export-ignore>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 shrink-0"
						aria-label={`Exportar ${title}`}
					>
						<Download className="mr-1 h-4 w-4" aria-hidden />
						Exportar
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onSelect={exportPng}>Imagen (PNG)</DropdownMenuItem>
					<DropdownMenuItem onSelect={exportCsv}>Datos (CSV)</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
