import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AddressLink } from '@/components/ui/address-link';
import { PostItNote } from '@/components/ui/post-it-note';
import { PostItModal } from '@/components/ui/post-it-modal';
import { ChecklistCompletionModal } from '@/components/business/works/checklists/checklist-completion-modal';
import {
	CheckCircle2,
	ClipboardCheck,
	Calendar,
	List,
	Mail,
	Clock,
	MessageCircle,
	StickyNote,
	Map,
	Home,
} from 'lucide-react';
import { statusConfig } from '@/constants/type-config';
import { WorkWithProgress } from '@/lib/works/works';
import { useState } from 'react';
import { translateError } from '@/lib/error-translator';
import { formatCreatedAt } from '@/utils/format-date';

interface WorkCardProps {
	work: WorkWithProgress;
	user: any;
	onOpenEmail: (work: WorkWithProgress) => void;
	onOpenWhatsApp: (work: WorkWithProgress) => void;
	onOpenChecklist: (work: WorkWithProgress) => void;
	onUpdateGeneralNote?: (workId: number, note: string) => Promise<void>;
}

export function WorkCard({
	work,
	user,
	onOpenEmail,
	onOpenWhatsApp,
	onOpenChecklist,
	onUpdateGeneralNote,
}: WorkCardProps) {
	const [isPostItModalOpen, setIsPostItModalOpen] = useState(false);
	const [isUpdatingNote, setIsUpdatingNote] = useState(false);

	const statusInfo = statusConfig.find((s) => s.value === work.status);

	const StatusIcon = statusInfo?.icon || Clock;
	const statusLabel = statusInfo?.label || 'Pendiente';
	const statusColor = statusInfo?.color || 'text-gray-400 bg-gray-400/10';

	const isAuthorized = user?.role === 'Admin';
	const canSendNotifications = isAuthorized;
	const canEditNotes = isAuthorized;

	const handleSaveGeneralNote = async (note: string) => {
		if (!onUpdateGeneralNote) return;

		setIsUpdatingNote(true);
		try {
			await onUpdateGeneralNote(work.id, note);
		} catch (error) {
			const errorMessage = translateError(error);
			console.error('Error al guardar la nota general:', errorMessage);
		} finally {
			setIsUpdatingNote(false);
		}
	};

	const cardContent = (
		<Card key={work.id} className="bg-card border-border">
			<div className="p-6">
				<div className="flex flex-col lg:flex-row items-start justify-between gap-4">
					<div className="flex-1 min-w-0 space-y-3">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
								<ClipboardCheck className="h-5 w-5 text-primary" />
							</div>

							<div className="text-muted-foreground">
								<span>{work.name || work.id}</span>
							</div>
						</div>

						<div className="flex-1 min-w-0">
							<p className="text-sm text-foreground mt-1">
								{[work.client_last_name, work.client_name].filter(Boolean).join(' ') ||
									'Cliente no especificado'}
							</p>
						</div>
						<div className="grid gap-2 md:grid-cols-4 text-sm">
							<div className="flex items-center text-muted-foreground col-span-2 gap-2">
								<AddressLink
									address={work.address || null}
									locality={work.locality}
									className="text-sm"
								/>
							</div>
							{work.zone && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Map className="h-4 w-4 flex-shrink-0" />
									<span>Zona: {work.zone}</span>
								</div>
							)}
							{work.hood && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Home className="h-4 w-4 flex-shrink-0" />
									<span>Barrio: {work.hood}</span>
								</div>
							)}
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<div className="text-sm text-muted-foreground">Progreso: {work.progress}%</div>
							</div>
							<Progress value={work.progress} className="h-2" />
						</div>

						{/* Post-it to show on desktop - only visible on large screens */}
						{work.general_note && (
							<div className="hidden md:block">
								<PostItNote note={work.general_note} />
							</div>
						)}

						<div className="flex items-center gap-3 flex-wrap">
							<Badge variant="outline" className={`gap-1 ${statusColor}`}>
								<StatusIcon className="h-3 w-3" />
								{statusLabel}
							</Badge>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Calendar className="h-4 w-4 flex-shrink-0" />
								<span>{formatCreatedAt(work.created_at)}</span>
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-2 w-full lg:w-auto">
						<ChecklistCompletionModal workId={work.id}>
							<Button variant="outline" size="sm">
								<CheckCircle2 className="mr-2 h-4 w-4" />
								Ver checklists
							</Button>
						</ChecklistCompletionModal>

						{isAuthorized && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									onOpenChecklist(work);
								}}
							>
								<List className="mr-2 h-4 w-4" />
								Agregar checklists
							</Button>
						)}

						{canEditNotes && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsPostItModalOpen(true)}
								className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
							>
								<StickyNote className="mr-2 h-4 w-4" />
								{work.general_note ? 'Editar nota' : 'Agregar nota'}
							</Button>
						)}

						{canSendNotifications && (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onOpenEmail(work)}
									disabled
									title="Enviar notificación por email"
								>
									<Mail className="mr-2 h-4 w-4" />
									Email
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onOpenWhatsApp(work)}
									title="Enviar notificación por WhatsApp"
									className="border-green-600 text-green-600 hover:bg-green-50"
								>
									<MessageCircle className="mr-2 h-4 w-4" />
									WhatsApp
								</Button>
							</>
						)}

						{work.hasNotes && (
							<Badge
								variant="secondary"
								className="gap-1 justify-center"
								title="Hay notas/recordatorios cargados"
							>
								<StickyNote className="h-3.5 w-3.5" />
								Notas
							</Badge>
						)}

						{work.general_note && (
							<Badge
								variant="secondary"
								className="gap-1 justify-center bg-yellow-100 text-yellow-800 border-yellow-300"
								title="Hay una nota general para esta obra"
							>
								<StickyNote className="h-3.5 w-3.5" />
								Nota general
							</Badge>
						)}
					</div>
				</div>
			</div>
		</Card>
	);

	// Modal to add/edit general note
	return (
		<>
			{cardContent}
			<PostItModal
				isOpen={isPostItModalOpen}
				onOpenChange={setIsPostItModalOpen}
				initialNote={work.general_note}
				onSave={handleSaveGeneralNote}
				isLoading={isUpdatingNote}
			/>
		</>
	);
}
