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
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Board } from './types';

interface BoardDeleteModalProps {
	board: Board | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	loading?: boolean;
}

export function BoardDeleteModal({
	board,
	open,
	onOpenChange,
	onConfirm,
	loading,
}: BoardDeleteModalProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<div className="flex items-center gap-2 mb-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						<AlertDialogTitle>Eliminar tablero</AlertDialogTitle>
					</div>
					<AlertDialogDescription asChild>
						<div className="space-y-2">
							<p>
								¿Estás seguro de que quieres eliminar el tablero <strong>"{board?.name}"</strong>?
							</p>
							<p className="text-sm text-muted-foreground">
								Esta acción eliminará permanentemente:
							</p>
							<ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
								<li>Todas las listas del tablero</li>
								<li>Todas las tarjetas de esas listas</li>
								<li>Todos los archivos adjuntos</li>
								<li>Los miembros del tablero</li>
							</ul>
							<p className="text-sm text-destructive font-medium mt-2">
								Esta acción no se puede deshacer.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={loading}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
						) : (
							<Trash2 className="h-4 w-4 mr-2" />
						)}
						{loading ? 'Eliminando...' : 'Eliminar tablero'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
