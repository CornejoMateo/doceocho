'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';

interface EditableFieldProps {
	value: string;
	onSave: (newValue: string) => Promise<void>;
	label?: string;
	className?: string;
	formatDisplay?: (value: string) => string;
}

export function EditableField({
	value,
	onSave,
	label,
	className = '',
	formatDisplay,
}: EditableFieldProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedValue, setEditedValue] = useState(value);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		if (editedValue !== value) {
			setIsSaving(true);
			try {
				await onSave(editedValue);
				setIsEditing(false);
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
		}
	};

	if (isEditing) {
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				{label && <span className="font-medium whitespace-nowrap">{label}:</span>}
				<Input
					value={editedValue}
					onChange={(e) => setEditedValue(e.target.value)}
					disabled={isSaving}
					className="h-8 text-sm"
				/>
				<Button
					variant="ghost"
					size="sm"
					onClick={handleSave}
					disabled={isSaving}
					className="h-8 w-8 p-0"
				>
					<Check className="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						setEditedValue(value);
						setIsEditing(false);
					}}
					disabled={isSaving}
					className="h-8 w-8 p-0"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>
		);
	}

	return (
		<div
			className={`group flex items-center gap-2 min-w-0 truncate whitespace-nowrap ${className}`}
		>
			{label && <span className="font-medium whitespace-nowrap">{label}:</span>}
			<span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
				{formatDisplay ? formatDisplay(value) : value || 'Sin especificar'}
			</span>
			<Button
				variant="ghost"
				size="sm"
				className="h-4 w-4 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-70 transition-opacity"
				onClick={(e) => {
					e.stopPropagation();
					setEditedValue(value);
					setIsEditing(true);
				}}
			>
				<Pencil className="h-3 w-3" />
			</Button>
		</div>
	);
}
