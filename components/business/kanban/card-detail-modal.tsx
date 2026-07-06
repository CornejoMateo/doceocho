import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { X, Clock, Paperclip, Upload } from 'lucide-react';
import { useCard } from '@/hooks/kanban/use-card';
import { translateError } from '@/lib/error-translator';
import { toast } from '@/components/ui/use-toast';
import { formatCreatedAt } from '@/utils/format-date';

interface CardDetailModalProps {
	cardId: number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCardDeleted?: () => void;
	onCardUpdated?: () => void;
}

export function CardDetailModal({
	cardId,
	open,
	onOpenChange,
	onCardDeleted,
	onCardUpdated,
}: CardDetailModalProps) {
	const { card, loading, error, updateCard, uploadFile, removeCard, removeAttachment } =
		useCard(cardId);
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [dueDate, setDueDate] = useState('');
	const [priority, setPriority] = useState('none');
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showCloseConfirm, setShowCloseConfirm] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (card) {
			setTitle(card.title);
			setDescription(card.description || '');
			setDueDate(card.due_date?.split('T')[0] || '');
			setPriority(card.priority || 'none');
			setHasUnsavedChanges(false);
		}
	}, [card]);

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

	const handlePriorityChange = (value: string) => {
		setPriority(value);
		setHasUnsavedChanges(true);
	};

	const handleSave = async () => {
		await updateCard({
			title,
			description,
			due_date: dueDate || null,
			priority: priority as any,
		});
		setHasUnsavedChanges(false);
		onOpenChange(false);
		if (onCardUpdated) {
			onCardUpdated();
		}
	};

	const handleClose = () => {
		if (hasUnsavedChanges) {
			setShowCloseConfirm(true);
		} else {
			onOpenChange(false);
		}
	};

	const handleConfirmClose = () => {
		setShowCloseConfirm(false);
		onOpenChange(false);
	};

	const handleCancelClose = () => {
		setShowCloseConfirm(false);
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setIsUploading(true);
		try {
			for (const file of Array.from(files)) {
				const { error } = await uploadFile(file);
				if (error) {
					toast({
						variant: 'destructive',
						title: 'Error al subir archivo',
						description: translateError(error),
					});
				}
			}
		} catch (error) {
			toast({
				variant: 'destructive',
				title: 'Error al subir archivos',
				description: translateError(error),
			});
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleDeleteAttachment = async (attachmentId: number) => {
		await removeAttachment(attachmentId);
	};

	const handleDeleteCard = async () => {
		await removeCard();
		onOpenChange(false);
		if (onCardDeleted) {
			onCardDeleted();
		}
	};

	if (!cardId) return null;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader className="border-b pb-4">
					<VisuallyHidden>
						<DialogTitle>Detalles de tarjeta</DialogTitle>
					</VisuallyHidden>
					<div className="flex items-start gap-4">
						<div className="flex-1 min-w-0">
							<Input
								value={title}
								onChange={(e) => handleTitleChange(e.target.value)}
								className="text-2xl font-bold border-none p-0 focus-visible:ring-0 bg-transparent"
								placeholder="Título de la tarjeta"
							/>
							<div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground flex-wrap">
								<span>En lista: {card?.list?.name || 'Sin asignar'}</span>
								<span>•</span>
								<span>Creado el {card ? formatCreatedAt(card.created_at) : ''}</span>
							</div>
						</div>
					</div>
				</DialogHeader>

				{loading ? (
					<div className="text-center py-8 flex-1">
						<p className="text-muted-foreground">Cargando tarjeta...</p>
					</div>
				) : error ? (
					<div className="text-center py-8 flex-1">
						<p className="text-destructive">Error: {error}</p>
					</div>
				) : !card ? (
					<div className="text-center py-8 flex-1">
						<p className="text-muted-foreground">Tarjeta no encontrada</p>
					</div>
				) : (
					<>
						<div className="flex-1 overflow-y-auto">
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								{/* Left Column - Main Content */}
								<div className="lg:col-span-2 space-y-6">
									{/* Labels */}
									{card.labels && card.labels.length > 0 && (
										<div className="flex flex-wrap gap-2">
											{card.labels.map((label) => (
												<Badge
													key={label.id}
													variant="secondary"
													className="cursor-pointer"
													style={{ backgroundColor: label.color, color: 'white' }}
												>
													{label.name}
												</Badge>
											))}
										</div>
									)}

									{/* Description */}
									<div>
										<h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">
											Descripción
										</h3>
										<Textarea
											value={description}
											onChange={(e) => handleDescriptionChange(e.target.value)}
											placeholder="Agregar una descripción más detallada..."
											className="min-h-[150px] resize-none"
										/>
									</div>

									{/* Due Date */}
									<div>
										<h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground flex items-center gap-2">
											<Clock className="h-4 w-4" />
											Fecha límite
										</h3>
										<Input
											type="date"
											value={dueDate}
											onChange={(e) => handleDueDateChange(e.target.value)}
											className="max-w-xs"
										/>
									</div>

									{/* Attachments */}
									<div>
										<h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground flex items-center gap-2">
											<Paperclip className="h-4 w-4" />
											Archivos adjuntos ({card.attachments?.length || 0})
										</h3>
										<div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/20">
											<p className="text-sm text-muted-foreground mb-3">
												Arrastra archivos aquí o haz clic para subir
											</p>
											<Button
												variant="outline"
												size="sm"
												onClick={() => fileInputRef.current?.click()}
												disabled={isUploading}
											>
												<Upload className="h-4 w-4 mr-2" />
												{isUploading ? 'Subiendo...' : 'Subir archivo'}
											</Button>
											<input
												ref={fileInputRef}
												type="file"
												multiple
												onChange={handleFileSelect}
												className="hidden"
											/>
										</div>
										{card.attachments && card.attachments.length > 0 && (
											<div className="mt-3 space-y-2">
												{card.attachments.map((attachment) => (
													<div
														key={attachment.id}
														className="flex items-center justify-between p-3 border rounded bg-background hover:bg-muted/50 transition-colors"
													>
														<span className="text-sm truncate max-w-[200px]">
															{attachment.file_name}
														</span>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 flex-shrink-0"
															onClick={() => handleDeleteAttachment(attachment.id)}
														>
															<X className="h-4 w-4" />
														</Button>
													</div>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Right Column - Sidebar */}
								<div className="space-y-6">
									{/* Add to Card */}
									<div className="space-y-2">
										<h3 className="font-semibold text-sm uppercase text-muted-foreground">
											Ver archivos
										</h3>
										<Button variant="outline" className="w-full justify-start gap-2">
											<Paperclip className="h-4 w-4" />
											Adjuntos
										</Button>
									</div>

									{/* Priority */}
									<div>
										<h3 className="font-semibold mb-2 text-sm uppercase text-muted-foreground">
											Prioridad
										</h3>
										{/* Extraer a un archivo de constantes */}
										<select
											value={priority}
											onChange={(e) => handlePriorityChange(e.target.value)}
											className="w-full p-2.5 border rounded-md bg-background"
										>
											<option value="none">Sin prioridad</option>
											<option value="low">Baja</option>
											<option value="medium">Media</option>
											<option value="high">Alta</option>
											<option value="very_high">Muy alta</option>
										</select>
									</div>

									{/* Actions */}
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
													>
														Eliminar
													</Button>
													<Button
														variant="outline"
														className="flex-1 min-w-0"
														size="sm"
														onClick={() => setShowDeleteConfirm(false)}
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
								</div>
							</div>
						</div>

						{/* Footer with Save Button */}
						{hasUnsavedChanges && (
							<div className="border-t pt-4 flex justify-end">
								<Button onClick={handleSave} size="sm">
									Guardar
								</Button>
							</div>
						)}
					</>
				)}
			</DialogContent>

			{/* Unsaved Changes Confirmation Dialog */}
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
		</Dialog>
	);
}
