import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Palette } from 'lucide-react';
import type { BoardFormData } from './types';
import { DialogDescription } from '@radix-ui/react-dialog';
import { BOARD_COLORS, BoardColor } from '@/constants/kanban/board-creation-modal';
import {
	BOARD_TEMPLATES,
	DEFAULT_BOARD_TEMPLATE_ID,
	getBoardTemplate,
} from '@/constants/kanban/board-templates';
import { cn } from '@/lib/utils';
interface BoardCreationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** The template id decides which lists the new board starts with. */
	onCreate: (board: BoardFormData, templateId: string) => void;
}

export function BoardCreationModal({ open, onOpenChange, onCreate }: BoardCreationModalProps) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [selectedColor, setSelectedColor] = useState<BoardColor>(BOARD_COLORS[0]);
	const [templateId, setTemplateId] = useState(DEFAULT_BOARD_TEMPLATE_ID);

	const handleCreate = () => {
		if (!name.trim()) return;
		onCreate(
			{
				name: name.trim(),
				description: description.trim() || undefined,
				color: selectedColor,
			},
			templateId
		);
		handleClose();
	};

	const handleClose = () => {
		setName('');
		setDescription('');
		setSelectedColor(BOARD_COLORS[0]);
		setTemplateId(DEFAULT_BOARD_TEMPLATE_ID);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90dvh] w-[95vw] flex-col gap-0 overflow-hidden sm:max-w-md">
				<DialogHeader>
					<DialogTitle asChild>
						<VisuallyHidden>Crear nuevo tablero</VisuallyHidden>
					</DialogTitle>
					<div className="flex items-center gap-2 mb-4">
						<Plus className="h-5 w-5" />
						<h2 className="text-lg font-semibold">Crear nuevo tablero</h2>
					</div>
				</DialogHeader>
				<DialogDescription className="mb-3 text-sm text-muted-foreground">
					Completa la información para crear un nuevo tablero.
				</DialogDescription>

				{/* Only the fields scroll, so the buttons stay reachable. */}
				<div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 py-1">
					<div className="space-y-2">
						<Label htmlFor="board-name" className="font-medium">
							Nombre del tablero
						</Label>
						<Input
							id="board-name"
							placeholder="Ej: Proyecto Marketing"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full"
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="board-description" className="font-medium">
							Descripción (opcional)
						</Label>
						<Textarea
							id="board-description"
							placeholder="Describe el propósito de este tablero..."
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full resize-none"
							rows={2}
						/>
					</div>

					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<Palette className="h-4 w-4" />
							<Label className="font-medium">Color del tablero</Label>
						</div>
						<div className="flex gap-2 flex-wrap">
							{BOARD_COLORS.map((color) => (
								<button
									key={color}
									type="button"
									onClick={() => setSelectedColor(color)}
									className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
										selectedColor === color
											? 'border-primary scale-110 ring-2 ring-primary/20'
											: 'border-transparent'
									}`}
									style={{ backgroundColor: color }}
									title={color}
								/>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<Label className="font-medium">¿Con qué listas arrancamos?</Label>
						<p className="text-xs text-muted-foreground">
							Las listas son las etapas del trabajo. Podés cambiarlas después.
						</p>
						<div className="grid gap-1.5">
							{BOARD_TEMPLATES.map((template) => {
								const isSelected = templateId === template.id;

								return (
									<button
										key={template.id}
										type="button"
										onClick={() => setTemplateId(template.id)}
										aria-pressed={isSelected}
										className={cn(
											'flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
											isSelected
												? 'border-primary bg-primary/5'
												: 'border-border hover:border-primary/50'
										)}
									>
										<template.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="min-w-0 space-y-0.5">
											<p className="text-sm font-medium leading-tight text-foreground">
												{template.name}
											</p>
											<p className="text-xs leading-tight text-muted-foreground">
												{template.description}
											</p>
											{template.lists.length > 0 && (
												<p className="text-xs leading-tight text-muted-foreground/80">
													{template.lists.join(' → ')}
												</p>
											)}
										</div>
									</button>
								);
							})}
						</div>
					</div>

					<div
						className="flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white"
						style={{ backgroundColor: selectedColor }}
					>
						<span className="truncate">{name || 'Nombre del tablero'}</span>
					</div>
				</div>

				<div className="mt-4 flex justify-end gap-2 border-t pt-4">
					<Button variant="outline" onClick={handleClose}>
						Cancelar
					</Button>
					<Button onClick={handleCreate} disabled={!name.trim()}>
						Crear tablero
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
