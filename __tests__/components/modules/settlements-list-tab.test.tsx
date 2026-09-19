import { render, screen, waitFor } from '@testing-library/react';
import { SettlementsListTab } from '@/components/business/modules/settlements/settlements-list-tab';
import { getModulesMonthlySettlementsByMonth } from '@/lib/modules/modules-settlements';

jest.mock('@/components/ui/select', () => ({
	Select: ({ children, onValueChange }: any) => (
		<select data-testid="select-native" onChange={(e) => onValueChange?.(e.target.value)}>
			{children}
		</select>
	),
	SelectTrigger: ({ children }: any) => <>{children}</>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock('@/components/ui/label', () => ({
	Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/spinner', () => ({
	Spinner: (props: any) => <div data-testid="spinner" {...props} />,
}));

jest.mock('@/components/ui/use-toast', () => ({
	toast: jest.fn(),
}));

jest.mock('@/utils/formats-money', () => ({
	formatCurrency: (v: number) => `$${v}`,
}));

jest.mock('@/lib/modules/modules-settlements', () => ({
	getModulesMonthlySettlementsByMonth: jest.fn(),
}));

const baseSettlement = {
	id: 1,
	user_id: 'u1',
	user_name: 'Juan Pérez',
	year: 2026,
	month: 6,
	amount: 45000,
};

describe('SettlementsListTab', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows singular and plural module count labels', async () => {
		(getModulesMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: [
				{ ...baseSettlement, id: 1, user_name: 'Juan Pérez', modules_count: 1 },
				{ ...baseSettlement, id: 2, user_name: 'María García', modules_count: 3 },
			],
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(screen.getByText('1 módulo')).toBeInTheDocument();
		});
		expect(screen.getByText('3 módulos')).toBeInTheDocument();
	});

	it('renders a numeric fallback instead of crashing when modules_count is null', async () => {
		(getModulesMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: [{ ...baseSettlement, modules_count: null }],
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		expect(screen.getByText('0 módulos')).toBeInTheDocument();
	});

	it('renders a numeric fallback instead of crashing when modules_count is undefined', async () => {
		const { modules_count, ...settlementWithoutCount } = { ...baseSettlement, modules_count: 0 };
		(getModulesMonthlySettlementsByMonth as jest.Mock).mockResolvedValue({
			data: [settlementWithoutCount],
			error: null,
		});

		render(<SettlementsListTab />);

		await waitFor(() => {
			expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
		});
		expect(screen.getByText('0 módulos')).toBeInTheDocument();
	});
});
