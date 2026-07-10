import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, Paperclip, Loader2 } from 'lucide-react';
import { formatCreatedAt } from '@/utils/format-date';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import type { CardWithRelations } from '@/components/business/kanban/types';
import type { Card } from '@/components/business/kanban/types';
import { PRIORITY_OPTIONS, Priority } from '@/constants/kanban/priority';

export interface CardFormHandle {
	requestClose: () => void;
}

export interface CardFormProps {
	card: CardWithRelations;
	updateCard: (
		changes: Partial<Omit<CardWithRelations, 'id' | 'created_at' | 'list_id' | 'files'>>
	) => Promise<Card | null>;
	removeCard: () => Promise<{ error: any } | undefined>;
	onClose: () => void;
	onSaveSuccess?: () => void;
	onDeleteSuccess?: () => void;
	onOpenGallery?: () => void;
}

export const CardForm = forwardRef<CardFormHandle, CardFormProps>(function CardForm(
	{ card, updateCard, removeCard, onClose, onSaveSuccess, onDeleteSuccess, onOpenGallery },
	ref
) {
	const { user } = useAuth();
	const isAuthorized = user?.role === 'Admin';

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [dueDate, setDueDate] = useState('');
	const [priority, setPriority] = useState<Priority>('none');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showCloseConfirm, setShowCloseConfirm] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [deleting, setDeleting] = useState(false);

	useImperativeHandle(ref, () => ({
		requestClose() {
			if (hasUnsavedChanges) {
				setShowCloseConfirm(true);
			} else {
				onClose();
			}
		},
	}));

	useEffect(() => {
		setTitle(card.title);
		setDescription(card.description || '');
		setDueDate(card.due_date?.split('T')[0] || '');
		setPriority(card.priority || 'none');
		setHasUnsavedChanges(false);
	}, [card.id, card.title, card.description, card.due_date, card.priority]);

	const handleTitleChange = (value: string) => {
		setTitle(value);
		setHasUnsavedChanges(true);
	};

	const handleDescriptionChange = (value: string) => {
		setDescription(value);
		setHasUnsavedChanges(true);
	};

	const handleDueDateChange = (value: string) => {
		setDueDate(value);
		setHasUnsavedChanges(true);
	};

	const handlePriorityChange = (value: Priority) => {
		setPriority(value);
		setHasUnsavedChanges(true);
	};

	const handleSave = async () => {
		try {
			const result = await updateCard({
				title,
				description: description || null,
				due_date: dueDate || null,
				priority,
			});
			if (result === null) {
				toast({
					variant: 'destructive',
					title: 'Error al guardar',
					description: 'No se pudieron guardar los cambios. Intenta de nuevo.',
				});
				return;
			}
			toast({ title: 'Tarjeta guardada correctamente' });
			setHasUnsavedChanges(false);
			if (onSaveSuccess) onSaveSuccess();
			onClose();
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error al guardar',
				description: translateError(error) || 'Ocurrió un error, intenta de nuevo.',
			});
		}
	};

	const handleConfirmClose = () => {
		setShowCloseConfirm(false);
		onClose();
	};

	const handleCancelClose = () => {
		setShowCloseConfirm(false);
	};

	const handleDeleteCard = async () => {
		setDeleting(true);
		toast({ title: 'Eliminando tarjeta...' });
		try {
			const result = await removeCard();
			if (result?.error) {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar',
					description: translateError(result.error) || 'No se pudo eliminar la tarjeta.',
				});
				setDeleting(false);
				return;
			}
			if (onDeleteSuccess) onDeleteSuccess();
			toast({ title: 'Tarjeta eliminada correctamente' });
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error al eliminar',
				description: translateError(error) || 'Ocurrió un error inesperado.',
			});
			setDeleting(false);
		}
	};

	return (
		<>
			<div className="flex-1 overflow-y-auto">
				<div className="space-y-6">
					{isAuthorized ? (
						<Input
							value={title}
							onChange={(e) => handleTitleChange(e.target.value)}
							className="text-2xl font-bold border-none p-0 focus-visible:ring-0 bg-transparent"
							placeholder="Título de la tarjeta"
						/>
					) : (
						<div className="text-2xl font-bold">{title}</div>
					)}

					<div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
						<span>En lista: {card.list?.name || 'Sin asignar'}</span>
						<span>•</span>
						<span>Creado el {formatCreatedAt(card.created_at)}</span>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
					<div className="lg:col-span-2 space-y-6">
						<div>
							<h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">
								Descripción
							</h3>
							{isAuthorized ? (
								<Textarea
									value={description}
									onChange={(e) => handleDescriptionChange(e.target.value)}
									placeholder="Agregar una descripción más detallada..."
									className="min-h-[150px] resize-none"
								/>
							) : (
								<div className="p-3 border rounded-md min-h-[150px] whitespace-pre-wrap">
									{description || 'Sin descripción'}
								</div>
							)}
						</div>

						<div>
							<h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground flex items-center gap-2">
								<Clock className="h-4 w-4" />
								Fecha límite
							</h3>
							{isAuthorized ? (
								<Input
									type="date"
									value={dueDate}
									onChange={(e) => handleDueDateChange(e.target.value)}
									className="max-w-xs"
								/>
							) : (
								<div className="text-sm">{dueDate || 'Sin fecha límite'}</div>
							)}
						</div>
					</div>

					<div className="space-y-6">
						{onOpenGallery && (
							<div className="space-y-2">
								<h3 className="font-semibold text-sm uppercase text-muted-foreground">
									Ver archivos
								</h3>
								<Button
									variant="outline"
									className="w-full justify-start gap-2"
									onClick={onOpenGallery}
								>
									<Paperclip className="h-4 w-4" />
									Adjuntos
								</Button>
							</div>
						)}

						<div>
							<h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">
								Prioridad
							</h3>
							{isAuthorized ? (
								<select
									value={priority}
									onChange={(e) => handlePriorityChange(e.target.value as Priority)}
									className="w-full p-2.5 border rounded-md bg-background"
								>
									{PRIORITY_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							) : (
								<div className="text-sm">
									{PRIORITY_OPTIONS.find((opt) => opt.value === priority)?.label || 'Sin prioridad'}
								</div>
							)}
						</div>

						{isAuthorized && (
							<div className="border-t pt-4">
								{showDeleteConfirm ? (
									<div className="space-y-3">
										<p className="text-sm text-muted-foreground">
											¿Estás seguro de eliminar esta tarjeta?
										</p>
										<div className="flex gap-2">
											<Button
												variant="destructive"
												className="flex-1 min-w-0"
												size="sm"
												onClick={handleDeleteCard}
												disabled={deleting}
											>
												{deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
												{deleting ? 'Eliminando...' : 'Eliminar'}
											</Button>
											<Button
												variant="outline"
												className="flex-1 min-w-0"
												size="sm"
												onClick={() => setShowDeleteConfirm(false)}
												disabled={deleting}
											>
												Cancelar
											</Button>
										</div>
									</div>
								) : (
									<Button
										variant="destructive"
										className="w-full"
										size="sm"
										onClick={() => setShowDeleteConfirm(true)}
									>
										Eliminar tarjeta
									</Button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>

			{isAuthorized && hasUnsavedChanges && (
				<div className="border-t pt-4 flex justify-end">
					<Button onClick={handleSave} size="sm">
						Guardar
					</Button>
				</div>
			)}

			<AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
						<AlertDialogDescription>
							Tienes cambios sin guardar en esta tarjeta. ¿Estás seguro de que deseas cerrar sin
							guardar?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancelClose}>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmClose}>Cerrar sin guardar</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
});
