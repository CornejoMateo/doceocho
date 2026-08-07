'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

interface EditableTextareaProps {
	value: string;
	onSave: (newValue: string) => Promise<void>;
	className?: string;
	formatDisplay?: (value: string) => string;
}

const MAX_PREVIEW_LENGTH = 100;

export function EditableTextarea({
	value,
	onSave,
	className = '',
	formatDisplay,
}: EditableTextareaProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editedValue, setEditedValue] = useState(value);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		if (editedValue !== value) {
			setIsSaving(true);
			try {
				await onSave(editedValue);
				setIsEditing(false);
				setIsModalOpen(false);
			} catch (error) {
				console.error('Error updating field:', error);
				const errorMessage = translateError(error);
				toast({
					title: 'Error al guardar',
					description: errorMessage,
					variant: 'destructive',
				});
			} finally {
				setIsSaving(false);
			}
		} else {
			setIsEditing(false);
			setIsModalOpen(false);
		}
	};

	const handleCancel = () => {
		setEditedValue(value);
		setIsEditing(false);
		setIsModalOpen(false);
	};

	const handleOpenChange = (open: boolean) => {
		if (!open && isSaving) {
			return;
		}
		if (!open) {
			setEditedValue(value);
			setIsEditing(false);
		}
		setIsModalOpen(open);
	};

	const displayValue = formatDisplay ? formatDisplay(value) : value || 'Sin especificar';
	const isLongText = displayValue.length > MAX_PREVIEW_LENGTH;
	const previewText = isLongText ? displayValue.slice(0, MAX_PREVIEW_LENGTH) + '...' : displayValue;

	if (isModalOpen) {
		return (
			<Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
					<DialogHeader>
						<DialogTitle>Detalles de la obra</DialogTitle>
						<DialogDescription>
							{isEditing
								? 'Edita los detalles de la obra'
								: 'Visualiza los detalles completos de la obra'}
						</DialogDescription>
					</DialogHeader>
					<div className="flex-1 overflow-y-auto py-4 min-h-0">
						{isEditing ? (
							<Textarea
								value={editedValue}
								onChange={(e) => setEditedValue(e.target.value)}
								disabled={isSaving}
								rows={6}
								className="resize-none w-full break-words"
								placeholder="Describe los detalles importantes de la obra"
							/>
						) : (
							<div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm bg-muted p-4 rounded-md">
								{displayValue}
							</div>
						)}
					</div>
					<DialogFooter className="flex-shrink-0">
						{isEditing ? (
							<>
								<Button variant="outline" onClick={handleCancel} disabled={isSaving}>
									<X className="h-4 w-4 mr-2" />
									Cancelar
								</Button>
								<Button onClick={handleSave} disabled={isSaving}>
									<Check className="h-4 w-4 mr-2" />
									Guardar
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" onClick={() => setIsModalOpen(false)}>
									Cerrar
								</Button>
								<Button
									onClick={() => {
										setEditedValue(value);
										setIsEditing(true);
									}}
								>
									<Pencil className="h-4 w-4 mr-2" />
									Editar
								</Button>
							</>
						)}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<div className={`group flex items-start gap-2 min-w-0 ${className}`}>
			<span className="whitespace-pre-wrap [overflow-wrap:anywhere] text-sm">{previewText}</span>
			{isLongText && (
				<Button
					variant="ghost"
					size="sm"
					className="h-4 w-4 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-70 transition-opacity flex-shrink-0"
					onClick={(e) => {
						e.stopPropagation();
						setIsModalOpen(true);
					}}
				>
					<Eye className="h-3 w-3" />
				</Button>
			)}
			<Button
				variant="ghost"
				size="sm"
				className="h-4 w-4 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-70 transition-opacity flex-shrink-0"
				onClick={(e) => {
					e.stopPropagation();
					setEditedValue(value);
					setIsEditing(true);
					setIsModalOpen(true);
				}}
			>
				<Pencil className="h-3 w-3" />
			</Button>
		</div>
	);
}
