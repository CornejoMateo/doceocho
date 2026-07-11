import { render, screen, fireEvent } from '@testing-library/react';
import { WorkCard } from '@/components/business/works/work-card';
import { WorkWithProgress } from '@/lib/works/works';

jest.mock('@/lib/error-translator', () => ({
	translateError: (e: any) => `translated: ${e?.message || e}`,
}));

jest.mock('@/components/ui/address-link', () => ({
	AddressLink: ({ address, locality }: any) => (
		<span>{[address, locality].filter(Boolean).join(' - ')}</span>
	),
}));

jest.mock('@/components/ui/post-it-note', () => ({
	PostItNote: ({ note }: any) => <div data-testid="post-it-note">{note}</div>,
}));

jest.mock('@/components/ui/post-it-modal', () => ({
	PostItModal: ({ isOpen, onOpenChange, initialNote, onSave, isLoading }: any) =>
		isOpen ? (
			<div data-testid="post-it-modal">
				<button onClick={() => onSave('Saved note')}>SaveNote</button>
			</div>
		) : null,
}));

jest.mock('@/components/business/works/checklists/checklist-completion-modal', () => ({
	ChecklistCompletionModal: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/utils/format-date', () => ({
	formatCreatedAt: (d: any) => d || 'no date',
	formatDate: (d: any) => d || 'no date',
}));

const baseWork: WorkWithProgress = {
	id: 1,
	address: 'Calle 123',
	locality: 'Springfield',
	client_name: 'Juan',
	client_last_name: 'Pérez',
	status: 'in_progress',
	progress: 65,
	created_at: '2024-06-15',
	architect: 'Arq. Gómez',
	furniture: 'Mesa y sillas',
	hasNotes: false,
	general_note: null,
	tasks: [],
};

describe('WorkCard', () => {
	const onOpenEmail = jest.fn();
	const onOpenWhatsApp = jest.fn();
	const onOpenChecklist = jest.fn();
	const onUpdateGeneralNote = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders work id and client name', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Pérez Juan')).toBeInTheDocument();
	});

	it('renders address and locality', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Calle 123 - Springfield')).toBeInTheDocument();
	});

	it('renders progress percentage', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Progreso: 65%')).toBeInTheDocument();
	});

	it('shows status badge', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('En progreso')).toBeInTheDocument();
	});

	it('shows "Ver checklists" button', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Ver checklists')).toBeInTheDocument();
	});

	it('shows "Agregar checklists" for authorized users', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Agregar checklists')).toBeInTheDocument();
	});

	it('hides "Agregar checklists" for non-admin users', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Colocador' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.queryByText('Agregar checklists')).not.toBeInTheDocument();
	});

	it('shows email and whatsapp buttons for authorized users', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Email')).toBeInTheDocument();
		expect(screen.getByText('WhatsApp')).toBeInTheDocument();
	});

	it('hides email and whatsapp buttons for non-admin users', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Colocador' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.queryByText('Email')).not.toBeInTheDocument();
		expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
	});

	it('shows "Agregar nota" when no general note', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Agregar nota')).toBeInTheDocument();
	});

	it('shows "Editar nota" when general note exists', () => {
		const workWithNote = { ...baseWork, general_note: 'Some note' };

		render(
			<WorkCard
				work={workWithNote}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Editar nota')).toBeInTheDocument();
	});

	it('calls onOpenEmail when email button is clicked', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		fireEvent.click(screen.getByText('Email'));
		expect(onOpenEmail).not.toHaveBeenCalled();
	});

	it('calls onOpenWhatsApp when WhatsApp button is clicked', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		fireEvent.click(screen.getByText('WhatsApp'));
		expect(onOpenWhatsApp).toHaveBeenCalledWith(baseWork);
	});

	it('calls onOpenChecklist when "Agregar checklists" is clicked', () => {
		render(
			<WorkCard
				work={baseWork}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		fireEvent.click(screen.getByText('Agregar checklists'));
		expect(onOpenChecklist).toHaveBeenCalledWith(baseWork);
	});

	it('shows "Nota general" badge when general_note exists', () => {
		const workWithNote = { ...baseWork, general_note: 'Some note' };

		render(
			<WorkCard
				work={workWithNote}
				user={{ role: 'Admin' }}
				onOpenEmail={onOpenEmail}
				onOpenWhatsApp={onOpenWhatsApp}
				onOpenChecklist={onOpenChecklist}
				onUpdateGeneralNote={onUpdateGeneralNote}
			/>
		);

		expect(screen.getByText('Nota general')).toBeInTheDocument();
	});
});
