import {
	headAlignOf,
	columnWidthsFromWeights,
	footerOffset,
	printableWidth,
	resolveMargin,
	capLines,
	limitFilters,
	columnStylesOf,
	defaultOrientation,
	filtersLine,
	footerText,
	needsNewPage,
	pdfColumnsOf,
	tableFontSize,
} from '@/helpers/pdf/layout';

describe('pdf layout helpers', () => {
	it('picks landscape only above 6 columns', () => {
		expect(defaultOrientation(6)).toBe('portrait');
		expect(defaultOrientation(7)).toBe('landscape');
	});

	it('decides page breaks with the footer reserve', () => {
		expect(needsNewPage(100, 50, 297)).toBe(false);
		expect(needsNewPage(240, 42, 297)).toBe(true); // 282 > 297 - 16
		expect(needsNewPage(240, 41, 297)).toBe(false);
	});

	it('formats footer and filters lines', () => {
		expect(footerText(2, 5)).toBe('Página 2 de 5');
		expect(filtersLine(undefined)).toBeNull();
		expect(filtersLine([])).toBe('Filtros aplicados: ninguno');
		expect(filtersLine(['Localidad: Palermo', 'Estado: Pausada'])).toBe(
			'Filtros aplicados: Localidad: Palermo | Estado: Pausada'
		);
	});

	it('builds column styles and bridges export tables', () => {
		const cols = pdfColumnsOf({
			headers: ['A', 'B'],
			aligns: ['left', 'right'],
			widths: [undefined, 20],
		});
		expect(cols).toEqual([
			{ header: 'A', align: 'left', width: undefined },
			{ header: 'B', align: 'right', width: 20 },
		]);
		expect(columnStylesOf(cols)).toEqual({
			0: { halign: 'left' },
			1: { halign: 'right', cellWidth: 20 },
		});
	});

	it('shrinks the font for wide tables', () => {
		expect(tableFontSize(4)).toBe(9);
		expect(tableFontSize(8)).toBe(8);
		expect(tableFontSize(11)).toBe(7);
		expect(tableFontSize(12)).toBe(6.5);
		expect(tableFontSize(30)).toBe(6.5);
	});

	it('limits filters and wrapped lines in the header', () => {
		const many = Array.from({ length: 10 }, (_, i) => `F${i}`);
		expect(limitFilters(many)).toHaveLength(9);
		expect(limitFilters(many).at(-1)).toBe('… y 2 filtros más');
		expect(limitFilters(many.slice(0, 9)).at(-1)).toBe('… y 1 filtro más');
		expect(limitFilters(['a'])).toEqual(['a']);
		expect(capLines(['1', '2', '3'], 6)).toEqual(['1', '2', '3']);
		expect(capLines(['1', '2', '3;'], 2)).toEqual(['1', '2…']);
	});

	it("keeps today's margins by default and resolves numbers and objects", () => {
		expect(resolveMargin()).toEqual({ top: 20, right: 14, bottom: 16, left: 14 });
		expect(resolveMargin(8)).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
		expect(resolveMargin({ top: 12, right: 8, bottom: 12, left: 8 }).right).toBe(8);
		expect(resolveMargin(-3).top).toBe(0);
	});

	it('computes printable width and footer offset from the margins', () => {
		expect(printableWidth(297, resolveMargin())).toBe(269);
		expect(printableWidth(297, resolveMargin({ top: 12, right: 8, bottom: 12, left: 8 }))).toBe(
			281
		);
		expect(footerOffset(16)).toBe(8);
		expect(footerOffset(12)).toBe(6);
		expect(footerOffset(2)).toBe(4);
	});

	it('page-break math honors a custom bottom margin', () => {
		expect(needsNewPage(190, 8, 210, 12)).toBe(false);
		expect(needsNewPage(191, 8, 210, 12)).toBe(true);
	});

	it('splits width by weight, filling missing weights and enforcing a minimum', () => {
		const w = columnWidthsFromWeights([4, 2, undefined, 2], 100);
		expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
		expect(w[0]).toBeGreaterThan(w[1]);
		const min = columnWidthsFromWeights([20, 1, 1], 60, 10);
		expect(min[1]).toBe(10);
		expect(min.reduce((a, b) => a + b, 0)).toBeCloseTo(60);
	});

	it('weighted columns span the printable width; without it styles are unchanged', () => {
		const cols = [
			{ header: 'Nombre', weight: 4 },
			{ header: 'Avance', weight: 1, align: 'right' as const },
			{ header: 'Fijo', width: 20 },
		];
		const styles = columnStylesOf(cols, 100);
		expect(styles[2].cellWidth).toBe(20);
		expect((styles[0].cellWidth as number) + (styles[1].cellWidth as number)).toBeCloseTo(80);
		expect(styles[0].cellWidth).toBeGreaterThan(styles[1].cellWidth as number);
		expect(styles[1].halign).toBe('right');
		expect(columnStylesOf(cols)[0]).toEqual({ halign: 'left' });
	});

	it('aligns headers like their column, defaulting to left', () => {
		const cols = [
			{ header: 'A', align: 'center' as const },
			{ header: 'B', align: 'right' as const },
			{ header: 'C' },
		];
		expect(headAlignOf(cols, 0)).toBe('center');
		expect(headAlignOf(cols, 1)).toBe('right');
		expect(headAlignOf(cols, 2)).toBe('left');
		expect(headAlignOf(cols, 9)).toBe('left');
	});
});
