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
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';
import { Module } from '@/lib/modules/modules';
import { getModuleWorkLabel } from '@/helpers/modules/modules-helper';
import { getModuleUserLabel } from '@/helpers/modules/modules-helper';
import { ModuleStatusBadge } from '@/helpers/modules/modules-helper';
import { formatCreatedAt } from '@/utils/format-date';

interface ModuleTableProps {
	modules: Module[];
	isLoading: boolean;
	showUser?: boolean;
	onRowClick: (module: Module) => void;
	onEdit: (module: Module) => void;
	onDelete: (module: Module) => void;
	onSend: (module: Module) => void;
	emptyText?: string;
}

export function ModuleTable({
	modules,
	isLoading,
	showUser = false,
	onRowClick,
	onEdit,
	onDelete,
	onSend,
	emptyText,
}: ModuleTableProps) {
	const isNotSend = (module: Module) => module.status === 'not_send' || module.status === null;

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
				<>
					<div className="hidden md:block" data-testid="module-table-desktop">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-center">Título</TableHead>
									{showUser && <TableHead className="text-center">Usuario</TableHead>}
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
										{showUser && (
											<TableCell className="max-w-[180px] truncate text-muted-foreground text-center">
												{getModuleUserLabel(module)}
											</TableCell>
										)}
										<TableCell className="max-w-[220px] truncate text-muted-foreground text-center">
											{getModuleWorkLabel(module)}
										</TableCell>
										<TableCell className="text-muted-foreground text-center">
											{formatCreatedAt(module.created_at)}
										</TableCell>
										<TableCell className="text-center">
											<div className="flex flex-col items-center gap-1">
												<ModuleStatusBadge status={module.status} />
												{isNotSend(module) && (
													<Button
														variant="outline"
														size="sm"
														className="h-6 px-2 text-xs gap-1"
														aria-label="Solicitar aprobación"
														onClick={(e) => {
															e.stopPropagation();
															onSend(module);
														}}
													>
														Solicitar Aprobación
													</Button>
												)}
											</div>
										</TableCell>
										<TableCell className="text-center">
											<div className="flex items-center justify-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													aria-label="Editar módulo"
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
													aria-label="Eliminar módulo"
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
					</div>

					<div className="md:hidden space-y-3 p-3" data-testid="module-table-mobile">
						{modules.map((module) => (
							<Card
								key={module.id}
								className="cursor-pointer gap-2 py-3"
								onClick={() => onRowClick(module)}
							>
								<CardContent className="p-0 px-3 space-y-3">
									<div className="flex items-start justify-between gap-2">
										<div className="flex-1 min-w-0 space-y-1">
											<p className="font-semibold text-base truncate">
												{module.title || 'Sin título'}
											</p>
											<ModuleStatusBadge status={module.status} />
										</div>
										<div className="flex items-center gap-1 flex-shrink-0">
											<Button
												variant="ghost"
												size="sm"
												className="h-8 w-8 p-0"
												aria-label="Editar módulo"
												onClick={(e) => {
													e.stopPropagation();
													onEdit(module);
												}}
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive hover:text-destructive h-8 w-8 p-0"
												aria-label="Eliminar módulo"
												onClick={(e) => {
													e.stopPropagation();
													onDelete(module);
												}}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
									<p className="text-sm text-muted-foreground">{getModuleWorkLabel(module)}</p>
									{showUser && (
										<p className="text-sm text-muted-foreground">
											Enviado por: {getModuleUserLabel(module)}
										</p>
									)}
									<div className="flex items-center justify-between gap-2 pt-2 border-t">
										<span className="text-sm text-muted-foreground">
											{formatCreatedAt(module.created_at)}
										</span>
										{isNotSend(module) && (
											<Button
												variant="outline"
												size="sm"
												className="h-6 px-2 text-xs gap-1"
												aria-label="Solicitar aprobación"
												onClick={(e) => {
													e.stopPropagation();
													onSend(module);
												}}
											>
												Solicitar Aprobación
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</>
			)}
		</Card>
	);
}
