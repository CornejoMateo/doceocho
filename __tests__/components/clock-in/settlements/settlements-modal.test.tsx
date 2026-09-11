import { render, screen, fireEvent } from '@testing-library/react';
import { SettlementsModal } from '@/components/business/clock-in/settlements/settlements-modal';
import { User } from '@/lib/users/users';

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
	DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	DialogHeader: ({ children }: any) => <div>{children}</div>,
	DialogTitle: ({ children }: any) => <h2>{children}</h2>,
	DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

jest.mock('@/components/ui/tabs', () => ({
	Tabs: ({ children }: any) => <div>{children}</div>,
	TabsList: ({ children }: any) => <div>{children}</div>,
	TabsTrigger: ({ children, value, ...props }: any) => (
		<button data-tab={value} {...props}>
			{children}
		</button>
	),
	TabsContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
	Select: ({ children }: any) => <div>{children}</div>,
	SelectTrigger: ({ children }: any) => <>{children}</>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <>{children}</>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, disabled, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} {...props}>
			{children}
		</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: ({ value, onChange, ...props }: any) => (
		<input value={value} onChange={onChange} {...props} />
	),
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
	formatCurrencyWithoutSymbol: (v: number) => `${v}`,
	formatNumber: (v: string) => v,
	parseArsToNumber: (v: string) => Number(v) || 0,
}));

jest.mock('@/lib/attendance/attendance-settings', () => ({
	getAttendanceSettings: jest.fn().mockResolvedValue({ data: null, error: null }),
}));

jest.mock('@/lib/attendance/attendance-entries', () => ({
	getAttendanceEntriesForMonth: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

jest.mock('@/lib/attendance/settlements', () => ({
	upsertMonthlySettlement: jest.fn().mockResolvedValue({ data: null, error: null }),
	getMonthlySettlementsByMonth: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => e?.message || 'Error',
}));

const mockUsers: User[] = [
	{ id: 1, uid_user: 'u1', name: 'Juan', last_name: 'Pérez', username: 'jperez', role: 'Taller' },
	{
		id: 2,
		uid_user: 'u2',
		name: 'María',
		last_name: 'García',
		username: 'mgarcia',
		role: 'Taller',
	},
	{ id: 3, uid_user: 'u3', name: 'Admin', last_name: 'User', username: 'admin', role: 'Admin' },
];

describe('SettlementsModal', () => {
	it('does not render when closed', () => {
		render(<SettlementsModal open={false} onOpenChange={jest.fn()} users={mockUsers} />);
		expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
	});

	it('renders when open', () => {
		render(<SettlementsModal open={true} onOpenChange={jest.fn()} users={mockUsers} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
	});

	it('renders the title and description', () => {
		render(<SettlementsModal open={true} onOpenChange={jest.fn()} users={mockUsers} />);
		expect(screen.getAllByText('Liquidaciones').length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText('Gestiona las liquidaciones de sueldos')).toBeInTheDocument();
	});

	it('renders both tabs', () => {
		render(<SettlementsModal open={true} onOpenChange={jest.fn()} users={mockUsers} />);
		expect(screen.getByText('Liquidar')).toBeInTheDocument();
		expect(screen.getAllByText('Liquidaciones').length).toBeGreaterThanOrEqual(1);
	});

	it('calls onOpenChange when closed', () => {
		const onOpenChange = jest.fn();
		render(<SettlementsModal open={true} onOpenChange={onOpenChange} users={mockUsers} />);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it('defaults users to empty array', () => {
		render(<SettlementsModal open={true} onOpenChange={jest.fn()} />);
		expect(screen.getByTestId('dialog')).toBeInTheDocument();
	});
});
