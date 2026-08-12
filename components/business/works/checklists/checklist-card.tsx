'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Edit, Trash2, CheckCircle2, Loader2, Upload, GripVertical, FileText } from 'lucide-react';
import { Checklist, ChecklistItem } from '@/lib/checklists/checklists';
import { uploadChecklistGalleryItem } from '@/lib/checklists/checklist-gallery';
import { calculateProgress } from '@/helpers/checklists/progress';
import { useFileUpload } from '@/hooks/use-file-upload';
import { ChecklistImages } from '@/components/business/works/checklists/checklist-images';
import { ChecklistItemGallery } from '@/components/business/works/checklists/checklist-item-gallery';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ChecklistCardProps {
	checklist: Checklist;
	items: ChecklistItem[];
	index: number;
	user: any;
	saving: boolean;
	loading: boolean;
	savingNotes: { [key: number]: boolean };
	onUpdateNotes: (checklistId: number, notes: string) => void;
	onToggleItem: (checklistId: number, itemId: number) => void;
	onSetAllItems: (checklistId: number, done: boolean) => void;
	onEdit: (checklist: Checklist) => void;
	onDelete: (checklist: Checklist) => void;
	onAddEntry: (checklist: Checklist, type: 'claim' | 'daily') => void;
	onReorderItems: (checklistId: number, items: ChecklistItem[]) => void;
	clientId?: number | null;
}

type SortableItemProps = {
	item: ChecklistItem;
	checklistId: number;
	saving: boolean;
	onToggle: (itemId: number) => void;
};

function SortableItemRow({ item, checklistId, saving, onToggle }: SortableItemProps) {
	const [galleryOpen, setGalleryOpen] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [galleryKey, setGalleryKey] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: item.id,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploading(true);
		const { error } = await uploadChecklistGalleryItem(item.id, file);
		setUploading(false);
		e.target.value = '';

		if (error) {
			toast({ title: 'Error', description: translateError(error), variant: 'destructive' });
		} else {
			toast({ title: 'Archivo subido', description: 'Archivo agregado correctamente.' });
			setGalleryKey((k) => k + 1);
		}
	};

	return (
		<div ref={setNodeRef} style={style} className="space-y-1">
			<div className="flex items-center gap-3 p-3 bg-card hover:bg-muted/30 rounded-lg border transition-colors">
				<button
					type="button"
					aria-label={`Reordenar item ${item.description}`}
					className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0 p-0.5"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="h-4 w-4" />
				</button>
				<Checkbox
					id={`checklist-${checklistId}-item-${item.id}`}
					checked={item.done || false}
					onCheckedChange={() => onToggle(item.id)}
					disabled={saving}
					className="flex-shrink-0"
				/>
				<label
					htmlFor={`checklist-${checklistId}-item-${item.id}`}
					className={`text-sm flex-1 cursor-pointer ${
						item.done ? 'line-through text-muted-foreground' : 'font-medium text-foreground'
					}`}
				>
					{item.description}
				</label>
				{item.done && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
			</div>
			<button
				type="button"
				onClick={() => setGalleryOpen(true)}
				className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-1 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
			>
				<FileText className="h-3.5 w-3.5" />
				Ver archivos
			</button>

			<Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
				<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Archivos — {item.description}</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<ChecklistItemGallery key={galleryKey} itemId={item.id} />
						<div className="flex items-center gap-2 pt-2 border-t">
							<input
								ref={fileInputRef}
								type="file"
								onChange={handleFileUpload}
								accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm,application/pdf"
								className="hidden"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								disabled={uploading}
							>
								{uploading ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Upload className="mr-2 h-4 w-4" />
								)}
								Subir archivo
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export function ChecklistCard({
	checklist,
	items,
	index,
	user,
	saving,
	loading,
	savingNotes,
	onUpdateNotes,
	onToggleItem,
	onSetAllItems,
	onEdit,
	onDelete,
	onReorderItems,
	clientId,
}: ChecklistCardProps) {
	const [imagesRefreshKey, setImagesRefreshKey] = useState(0);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	const {} = useFileUpload({
		clientId: clientId || 0,
		getDefaultDisplayName: (file) => checklist.name || file.name.replace(/\.[^/.]+$/, ''),
		getDefaultDescription: () => checklist.description || '',
		onUploadSuccess: () => setImagesRefreshKey((prev) => prev + 1),
	});

	const isAdmin = user?.role === 'Admin';

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = items.findIndex((i) => i.id === active.id);
		const newIndex = items.findIndex((i) => i.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const newItems = [...items];
		const [moved] = newItems.splice(oldIndex, 1);
		newItems.splice(newIndex, 0, moved);

		const reordered = newItems.map((item, idx) => ({ ...item, sort_order: idx }));

		onReorderItems(checklist.id, reordered);
	};

	return (
		<Card key={checklist.id} className="border-2 shadow-sm">
			<CardHeader className="pb-4 space-y-4">
				<div className="flex items-start justify-between gap-2">
					<div className="space-y-3 flex-1">
						<h3 className="text-xl font-bold text-foreground">
							{checklist.name || `Paso ${index + 1}`}
						</h3>

						{checklist.description && (
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">Descripción</Label>
								<p className="text-sm text-foreground">{checklist.description}</p>
							</div>
						)}

						{checklist.type_furniture && (
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">Material</Label>
								<p className="text-sm text-foreground">{checklist.type_furniture}</p>
							</div>
						)}

						{(checklist.width != null || checklist.height != null || checklist.depth) && (
							<div className="space-y-1">
								<Label className="text-xs text-muted-foreground">
									Medidas (Ancho x Alto x Profundidad)
								</Label>
								<p className="text-sm text-foreground">
									{[
										checklist.width != null ? `${checklist.width}` : '',
										checklist.height != null ? `${checklist.height}` : '',
										checklist.depth || '',
									]
										.filter(Boolean)
										.join(' x ') || '-'}
								</p>
							</div>
						)}
					</div>
					{isAdmin && (
						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onEdit(checklist)}
								disabled={saving}
								className="text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0 h-8 w-8"
								title="Editar checklist"
							>
								<Edit className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onDelete(checklist)}
								disabled={saving}
								className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8"
								title="Eliminar checklist"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					)}
				</div>

				<div className="space-y-2 pt-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs text-muted-foreground">Progreso</Label>
						<span className="text-sm font-semibold text-primary">{calculateProgress(items)}%</span>
					</div>
					<div className="w-full bg-secondary rounded-full h-2.5">
						<div
							className="bg-primary h-2.5 rounded-full transition-all duration-300"
							style={{ width: `${calculateProgress(items)}%` }}
						/>
					</div>
				</div>

				<div className="space-y-2 pt-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs text-muted-foreground">Nota / recordatorio</Label>
						{savingNotes[checklist.id] && (
							<span className="text-xs text-muted-foreground">Guardando...</span>
						)}
					</div>
					<Textarea
						value={checklist.notes || ''}
						onChange={(e) => onUpdateNotes(checklist.id, e.target.value)}
						placeholder="Escribí una nota para esta checklist (ej: falta sellador, revisar nivel, etc.)"
						className="text-sm"
						disabled={loading}
					/>
				</div>
			</CardHeader>

			<CardContent className="pt-0 pb-6">
				<div className="space-y-3">
					<div className="flex items-center justify-between gap-2">
						<h4 className="font-medium text-sm text-muted-foreground">Items de Checklist</h4>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => onSetAllItems(checklist.id, true)}
								disabled={saving || items.length === 0}
							>
								Marcar todo
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => onSetAllItems(checklist.id, false)}
								disabled={saving || items.length === 0}
							>
								Desmarcar todo
							</Button>
						</div>
					</div>

					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
							<div className="space-y-2 max-h-80 overflow-y-auto pr-1">
								{items.map((item) => (
									<SortableItemRow
										key={item.id}
										item={item}
										checklistId={checklist.id}
										saving={saving}
										onToggle={(itemId) => onToggleItem(checklist.id, itemId)}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				</div>

				<ChecklistImages key={`${checklist.id}-${imagesRefreshKey}`} checklistId={checklist.id} />
			</CardContent>
		</Card>
	);
}
