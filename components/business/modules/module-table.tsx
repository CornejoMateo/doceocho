'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';
import { Module } from '@/lib/modules/modules';
import { getModuleWorkLabel } from '@/helpers/modules/modules-helper';
import { ModuleStatusBadge } from '@/helpers/modules/modules-helper';
import { formatCreatedAt } from '@/utils/format-date';

interface ModuleTableProps {
	modules: Module[];
	isLoading: boolean;
	onRowClick: (module: Module) => void;
	onEdit: (module: Module) => void;
	onDelete: (module: Module) => void;
	emptyText?: string;
}

export function ModuleTable({
	modules,
	isLoading,
	onRowClick,
	onEdit,
	onDelete,
	emptyText,
}: ModuleTableProps) {
	return (
		<Card className="overflow-hidden">
			{isLoading ? (
				<div className="flex items-center justify-center py-10">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : modules.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-10">
					{emptyText ?? 'Todavía no hay módulos registrados este mes.'}
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="text-center">Título</TableHead>
							<TableHead className="text-center">Obra</TableHead>
							<TableHead className="text-center">Fecha</TableHead>
							<TableHead className="text-center">Estado</TableHead>
							<TableHead className="text-center">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{modules.map((module) => (
							<TableRow
								key={module.id}
								className="cursor-pointer"
								onClick={() => onRowClick(module)}
							>
								<TableCell className="font-medium max-w-[200px] truncate text-center">
									{module.title || 'Sin título'}
								</TableCell>
								<TableCell className="max-w-[220px] truncate text-muted-foreground text-center">
									{getModuleWorkLabel(module)}
								</TableCell>
								<TableCell className="text-muted-foreground text-center">
									{formatCreatedAt(module.created_at)}
								</TableCell>
								<TableCell className="text-center">
									<ModuleStatusBadge status={module.status} />
								</TableCell>
								<TableCell className="text-center">
									<div className="flex items-center justify-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											onClick={(e) => {
												e.stopPropagation();
												onEdit(module);
											}}
										>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="hover:bg-destructive hover:text-destructive-foreground"
											onClick={(e) => {
												e.stopPropagation();
												onDelete(module);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</Card>
	);
}
