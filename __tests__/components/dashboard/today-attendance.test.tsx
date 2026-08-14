import React from 'react';
import { render, screen } from '@testing-library/react';
import { TodayAttendance } from '@/components/dashboard/today-attendance';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getAttendanceEntriesForDay } from '@/lib/attendance/attendance-entries';

jest.mock('@/hooks/use-optimized-realtime', () => ({
	useOptimizedRealtime: jest.fn(),
}));

jest.mock('@/lib/attendance/attendance', () => ({
	...jest.requireActual('@/lib/attendance/attendance'),
	getAttendanceEntriesForDay: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
	Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

beforeEach(() => {
	jest.useFakeTimers().setSystemTime(new Date('2026-06-15T23:30:00.000Z')); // 20:30 in UTC-3
});

afterEach(() => {
	jest.useRealTimers();
});

function createEntries() {
	const today = new Date().toISOString().split('T')[0];

	return [
		{
			id: 1,
			attendance_id: 100,
			attendance_date: today,
			user_id: 'u1',
			user_name: 'Juan Perez',
			type: 'regular_in',
			entry_time: `${today}T09:00:00.000Z`,
			latitude: 0,
			longitude: 0,
			description: null,
		},
		{
			id: 2,
			attendance_id: 100,
			attendance_date: today,
			user_id: 'u1',
			user_name: 'Juan Perez',
			type: 'regular_out',
			entry_time: `${today}T17:00:00.000Z`,
			latitude: 0,
			longitude: 0,
			description: null,
		},
		{
			id: 3,
			attendance_id: 101,
			attendance_date: '2000-01-01',
			user_id: 'u2',
			user_name: 'Ana Garcia',
			type: 'regular_in',
			entry_time: '2000-01-01T09:00:00.000Z',
			latitude: 0,
			longitude: 0,
			description: null,
		},
	];
}

function setup({ data, loading = false }: { data?: any[]; loading?: boolean } = {}) {
	const entries = data ?? createEntries();
	(useOptimizedRealtime as jest.Mock).mockReturnValue({ data: entries, loading });
	(getAttendanceEntriesForDay as jest.Mock).mockResolvedValue({ data: entries, error: null });
	render(<TodayAttendance />);
}

describe('TodayAttendance', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the title and today entries count', () => {
		setup();
		expect(screen.getByText('Fichajes de hoy')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('only shows entries from today', () => {
		setup();
		expect(screen.getByText('Juan Perez')).toBeInTheDocument();
		expect(screen.queryByText('Ana Garcia')).not.toBeInTheDocument();
	});

	it('shows entry type and time', () => {
		setup();
		expect(screen.getByText('Entrada')).toBeInTheDocument();
		expect(screen.getByText('Salida')).toBeInTheDocument();
	});

	it('shows Entrada before Salida for the same user', () => {
		const entries = createEntries();
		const reversed = [...entries.slice(0, 2)].reverse();
		setup({ data: [...reversed, entries[2]] });

		const entrada = screen.getByText('Entrada');
		const salida = screen.getByText('Salida');

		expect(entrada.compareDocumentPosition(salida) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
	});

	it('shows the loading message while loading', () => {
		setup({ loading: true });
		expect(screen.getByText('Cargando fichajes...')).toBeInTheDocument();
	});

	it('shows empty state when there are no entries today', () => {
		setup({ data: [] });
		expect(screen.getByText('No hay fichajes hoy')).toBeInTheDocument();
	});

	it('shows users who are still working first', () => {
		const today = new Date().toISOString().split('T')[0];
		const stillWorking = {
			id: 4,
			attendance_id: 102,
			attendance_date: today,
			user_id: 'u3',
			user_name: 'Luis Gomez',
			type: 'regular_in',
			entry_time: `${today}T08:00:00.000Z`,
			latitude: 0,
			longitude: 0,
			description: null,
		};
		setup({ data: [...createEntries(), stillWorking] });

		const container = screen.getByText('Luis Gomez').parentElement!.parentElement!;
		const juanCard = screen.getByText('Juan Perez').parentElement!.parentElement!;

		expect(container.compareDocumentPosition(juanCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
	});
});
