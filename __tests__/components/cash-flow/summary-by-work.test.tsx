import { render, screen, within } from '@testing-library/react';
import { SummaryByWork } from '@/components/business/cash-flow/summary-by-work';
import { WorkResultRow } from '@/helpers/cash-flow-stats/cash-flow-summary';

function row(over: Partial<WorkResultRow> = {}): WorkResultRow {
	return {
		workId: 1,
		workName: 'Casa Belgrano',
		incomeNet: 1000,
		expenseNet: 400,
		result: 600,
		...over,
	};
}

describe('SummaryByWork', () => {
	it('shows an empty-state message when there are no rows', () => {
		render(<SummaryByWork rows={[]} />);
		expect(
			screen.getByText('No hay obras con movimientos en el período seleccionado')
		).toBeInTheDocument();
	});

	it('renders Obra / Ingresos / Gastos / Resultado for each row', () => {
		render(<SummaryByWork rows={[row()]} />);

		const table = within(screen.getByTestId('summary-by-work-table'));
		expect(table.getByText('Casa Belgrano')).toBeInTheDocument();
		expect(table.getByText(/^\$\s*1\.000$/)).toBeInTheDocument();
		expect(table.getByText(/^\$\s*400$/)).toBeInTheDocument();
		expect(table.getByText(/^\$\s*600$/)).toBeInTheDocument();
	});

	it('highlights a negative resultado as destructive', () => {
		render(<SummaryByWork rows={[row({ result: -200 })]} />);
		const resultCell = screen.getByText(/-\$\s*200/);
		expect(resultCell.className).toContain('text-destructive');
	});

	it('preserves row order (callers are expected to pre-sort by resultado)', () => {
		const rows = [
			row({ workId: 1, workName: 'B', result: 10 }),
			row({ workId: 2, workName: 'A', result: 500 }),
		];
		render(<SummaryByWork rows={rows} />);

		const table = within(screen.getByTestId('summary-by-work-table'));
		const names = table
			.getAllByRole('row')
			.slice(1)
			.map((r) => r.textContent);
		expect(names?.[0]).toContain('B');
		expect(names?.[1]).toContain('A');
	});
});
