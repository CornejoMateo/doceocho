/** Declarative description of a PDF. Consumed by generatePdf; contains no jsPDF types. */

export type PdfOrientation = 'portrait' | 'landscape';
export type PdfAlign = 'left' | 'right' | 'center';

export type PdfMargin = number | { top: number; right: number; bottom: number; left: number };

export type PdfColumn = {
	header: string;
	align?: PdfAlign;
	/** Fixed width in mm; omit for automatic. */
	width?: number;
	/** Relative width. When the columns of a table have weights, they split the printable width. */
	weight?: number;
};

export type PdfImageData = {
	/** PNG data URL. */
	dataUrl: string;
	/** Pixel size, used only for the aspect ratio. */
	width: number;
	height: number;
};

export type PdfSection =
	| {
			type: 'heading';
			text: string;
			/** Minimum height (mm) of the content that must fit under the heading on the same page. */
			reserve?: number;
	  }
	| { type: 'paragraph'; text: string; italic?: boolean; reserve?: number }
	| {
			type: 'kpis';
			items: { label: string; value: string; detail?: string }[];
	  }
	| {
			type: 'table';
			columns: PdfColumn[];
			rows: (string | number)[][];
			fontSize?: number;
			/** Shown instead of the table when there are no rows. */
			emptyText?: string;
	  }
	| {
			type: 'image';
			title: string;
			/** Resolves the image. null = nothing to draw (emptyText shown); throwing = skipped with failText. */
			load: () => Promise<PdfImageData | null>;
			emptyText?: string;
			failText?: string;
	  }
	| { type: 'pageBreak'; orientation?: PdfOrientation };

export type PdfDocument = {
	title: string;
	/** Summary line under the filters, e.g. 'Obras incluidas: 12 de 40'. */
	subtitle?: string;
	/** undefined = no filters line; [] = 'Filtros aplicados: ninguno'. */
	filtersDescription?: string[];
	orientation: PdfOrientation;
	/** Base of the file name, e.g. 'metricas-obras'. */
	filenameBase: string;
	/** Page margins in mm (a number applies to all four sides). Default: 20 top, 14 sides, 16 bottom. */
	margin?: PdfMargin;
	/** Tighter header spacing and cell padding, for dense tables. */
	compact?: boolean;
	sections: PdfSection[];
};

export type PdfResult = { filename: string; skipped: string[] };
