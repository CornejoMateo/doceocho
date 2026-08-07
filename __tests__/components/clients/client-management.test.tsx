import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClientManagement } from '@/components/business/clients/client-management';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { useAuth } from '@/components/provider/auth-provider';
import { useClientBudgetsInfo } from '@/hooks/clients/use-client-budgets-info';

jest.mock('@/hooks/use-optimized-realtime', () => ({
	useOptimizedRealtime: jest.fn(),
}));

jest.mock('@/components/provider/auth-provider', () => ({
	useAuth: jest.fn(),
}));

jest.mock('@/hooks/clients/use-client-budgets-info', () => ({
	useClientBudgetsInfo: jest.fn(),
}));

const mockUseSearchParams = jest.fn();

jest.mock('next/navigation', () => ({
	useSearchParams: () => mockUseSearchParams(),
}));

jest.mock('@/components/ui/use-toast', () => ({
	useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('@/components/business/clients/clients-add-dialog', () => ({
	ClientsAddDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid="client-add-dialog" /> : null,
}));

jest.mock('@/components/business/clients/client-details-dialog', () => ({
	ClientDetailsDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
		isOpen ? (
			<div data-testid="client-details-dialog">
				<button onClick={onClose}>Close</button>
			</div>
		) : null,
}));

jest.mock('@/components/ui/dialog', () => ({
	Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	),
}));

jest.mock('@/components/ui/input', () => ({
	Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
	Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
	Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/pagination', () => ({
	Pagination: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	PaginationContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	PaginationItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	PaginationLink: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	PaginationNext: ({ onClick }: any) => <button onClick={onClick}>next</button>,
	PaginationPrevious: ({ onClick }: any) => <button onClick={onClick}>prev</button>,
}));

describe('ClientManagement', () => {
	const refresh = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseSearchParams.mockReturnValue(new URLSearchParams());
		(useAuth as jest.Mock).mockReturnValue({ user: { role: 'Admin' } });
		(useOptimizedRealtime as jest.Mock).mockReturnValue({
			data: [
				{ id: 1, name: 'Juan', last_name: 'Pérez', locality: 'Rosario' },
				{ id: 2, name: 'Ana', last_name: 'Gómez', locality: 'Córdoba' },
			],
			loading: false,
			error: null,
			refresh,
		});
		(useClientBudgetsInfo as jest.Mock).mockReturnValue({
			info: {
				1: { total: 2, chosen: 1 },
				2: { total: 0, chosen: 0 },
			},
			loading: false,
		});
	});

	it('renders clients and filters by search', () => {
		render(<ClientManagement />);

		expect(screen.getByText('Pérez Juan')).toBeInTheDocument();
		expect(screen.getByText('Gómez Ana')).toBeInTheDocument();

		fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o localidad...'), {
			target: { value: 'Ros' },
		});

		expect(screen.getByText('Pérez Juan')).toBeInTheDocument();
	});

	it('hides add button for Taller role', () => {
		(useAuth as jest.Mock).mockReturnValue({ user: { role: 'Taller' } });
		render(<ClientManagement />);

		expect(screen.queryByText('Nuevo cliente')).not.toBeInTheDocument();
	});

	it('keeps details dialog closed after closing and refreshing the client list', () => {
		mockUseSearchParams.mockReturnValue(new URLSearchParams('clientId=1'));
		const { rerender } = render(<ClientManagement />);

		expect(screen.getByTestId('client-details-dialog')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Close'));
		expect(screen.queryByTestId('client-details-dialog')).not.toBeInTheDocument();

		(useOptimizedRealtime as jest.Mock).mockReturnValue({
			data: [
				{ id: 1, name: 'Juan', last_name: 'Pérez', locality: 'Rosario' },
				{ id: 2, name: 'Ana', last_name: 'Gómez', locality: 'Córdoba' },
				{ id: 3, name: 'Luis', last_name: 'Díaz', locality: 'Buenos Aires' },
			],
			loading: false,
			error: null,
			refresh,
		});

		rerender(<ClientManagement />);

		expect(screen.queryByTestId('client-details-dialog')).not.toBeInTheDocument();
	});
});
