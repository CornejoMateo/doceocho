import { render, screen, waitFor } from '@testing-library/react';
import { SupplierWithholdingsTab } from '@/components/business/suppliers/supplier-withholdings-tab';
import { listWithholdings } from '@/lib/withholdings/withholdings';
import type { Supplier } from '@/lib/suppliers/suppliers';

jest.mock('@/lib/withholdings/withholdings', () => ({
	...jest.requireActual('@/lib/withholdings/withholdings'),
	listWithholdings: jest.fn(),
}));

const suppliers: Supplier[] = [
	{
		id: 1,
		created_at: '2024-01-01',
		name: 'Vidrios SA',
		business_name: null,
		tax_id: null,
		whatsapp: null,
		email: null,
		category: null,
		locality: null,
		address: null,
		payment_terms_days: null,
		notes: null,
		is_active: true,
		income_tax_condition: null,
	},
];

const row = {
	id: 1,
	expense_id: 10,
	payment_id: 99,
	date: '2026-10-01',
	period: '2026-10',
	tax_regime: 'Régimen general',
	imputed_amount: 1000,
	rate: 0.02,
	withheld_amount: 20,
	total_amount: 980,
	notes: null,
	created_at: '2026-10-01T00:00:00Z',
	supplier_name: 'Vidrios SA',
};

describe('SupplierWithholdingsTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders rows and footer totals', async () => {
		(listWithholdings as jest.Mock).mockResolvedValue({ data: [row], error: null });
		render(<SupplierWithholdingsTab suppliers={suppliers} />);

		await waitFor(() => expect(screen.getByText('Vidrios SA')).toBeInTheDocument());
		// Imputado appears twice: once in the row, once in the footer total (single row => same amount).
		expect(screen.getAllByText('$ 1.000,00')).toHaveLength(2);
		expect(screen.getAllByText('$ 20,00')).toHaveLength(2);
		expect(screen.getAllByText('$ 980,00')).toHaveLength(2);
	});

	it('shows "Sin proveedor" muted when the row has no supplier', async () => {
		(listWithholdings as jest.Mock).mockResolvedValue({
			data: [{ ...row, supplier_name: null }],
			error: null,
		});
		render(<SupplierWithholdingsTab suppliers={suppliers} />);

		await waitFor(() => expect(screen.getByText('Sin proveedor')).toBeInTheDocument());
		expect(screen.getByText('Sin proveedor')).toHaveClass('text-muted-foreground');
	});

	it('refetches when refreshToken changes', async () => {
		(listWithholdings as jest.Mock).mockResolvedValue({ data: [row], error: null });
		const { rerender } = render(<SupplierWithholdingsTab suppliers={suppliers} refreshToken={1} />);

		await waitFor(() => expect(listWithholdings).toHaveBeenCalledTimes(1));

		rerender(<SupplierWithholdingsTab suppliers={suppliers} refreshToken={2} />);

		await waitFor(() => expect(listWithholdings).toHaveBeenCalledTimes(2));
	});
});
