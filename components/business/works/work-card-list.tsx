'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Work } from '@/lib/works/works';
import {
	MapPin,
	Calendar,
	Building2,
	Trash2,
	ListChecks,
	ChevronDown,
	CheckSquare,
	BrickWall,
	Wallet,
	FileText,
	Files,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { EditableField } from '@/components/business/works/editable-field';
import { EditableTextarea } from '@/components/business/works/editable-textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { statusConfig } from '@/constants/type-config';
import { BalanceWithBudget } from '@/lib/balances/balances';
import { formatCurrency } from '@/utils/formats-money';
import { WorkFilesDialog } from '@/components/business/works/work-files';
import { useAuth } from '@/components/provider/auth-provider';

interface WorkCardProps {
	work: Work;
	hasChecklist: boolean;
	loadingChecklist: boolean;
	balances: BalanceWithBudget[];
	onUpdate?: (workId: number, updates: Partial<Work>) => Promise<void>;
	onOpenChecklist: (workId: number) => void;
	onOpenBalance?: (workId: number, balanceId: number) => void;
	onDeleteWork?: (work: Work) => void;
}

export function WorkCardList({
	work,
	hasChecklist,
	loadingChecklist,
	balances,
	onUpdate,
	onOpenChecklist,
	onOpenBalance,
	onDeleteWork,
}: WorkCardProps) {
	const [balancePopoverOpen, setBalancePopoverOpen] = useState(false);
	const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
	const { user } = useAuth();

	const isAuthorized = user?.role === 'Admin';
	const canEdit = isAuthorized && !!onUpdate;

	const handleUpdateWork = async (workId: number, updates: Partial<Work>) => {
		await onUpdate?.(workId, updates);
	};

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-2 sm:pb-3">
				<div className="flex flex-col gap-2">
					<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
						<div className="flex-1 min-w-0">
							<EditableField
								value={work.name || ''}
								onSave={async (newValue) => {
									await handleUpdateWork(work.id, { name: newValue });
								}}
								className="text-base mt-2 sm:text-lg font-semibold truncate"
								showEditButton={isAuthorized}
							/>
							<EditableField
								value={work.address || ''}
								onSave={async (newValue) => {
									await handleUpdateWork(work.id, { address: newValue });
								}}
								label="Dirección"
								className="text-xs mt-2 sm:text-sm text-muted-foreground truncate"
								showEditButton={isAuthorized}
							/>
							<EditableField
								value={work.locality || ''}
								onSave={async (newValue) => {
									await handleUpdateWork(work.id, { locality: newValue });
								}}
								label="Localidad"
								className="text-xs mt-2 sm:text-sm text-muted-foreground truncate"
								showEditButton={isAuthorized}
							/>
							<EditableField
								value={work.zone || ''}
								onSave={async (newValue) => {
									await handleUpdateWork(work.id, { zone: newValue });
								}}
								formatDisplay={(value) => value || 'Zona no especificada'}
								label="Zona"
								className="text-xs mt-2 sm:text-sm text-muted-foreground truncate"
								showEditButton={isAuthorized}
							/>
							<EditableField
								value={work.hood || ''}
								onSave={async (newValue) => {
									await handleUpdateWork(work.id, { hood: newValue });
								}}
								formatDisplay={(value) => value || 'Barrio no especificado'}
								label="Barrio"
								className="text-xs mt-2 sm:text-sm text-muted-foreground truncate"
								showEditButton={isAuthorized}
							/>
						</div>
						<div className="flex flex-row sm:flex-row gap-2 sm:gap-3 items-center justify-between sm:justify-end">
							<div className="flex items-center justify-end gap-2">
								{isAuthorized && (
									<div className="flex items-center gap-1 text-[11px] sm:text-sm text-muted-foreground group">
										<select
											value={work.status || 'pending'}
											onChange={async (e) => {
												await handleUpdateWork(work.id, { status: e.target.value });
											}}
											className="bg-transparent border-none focus:ring-0 focus:ring-offset-0 p-0.5 pr-5 sm:p-1 sm:pr-6 appearance-none focus:outline-none cursor-pointer hover:bg-muted rounded-md text-[11px] sm:text-sm"
										>
											{statusConfig.map((option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
										<ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 -ml-4 sm:-ml-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
									</div>
								)}
								<div className="flex items-center gap-1">
									{loadingChecklist ? (
										<div className="h-4 w-4 rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground animate-spin" />
									) : hasChecklist ? (
										<div
											className="flex items-center gap-1 text-green-600"
											title="Checklists creadas"
										>
											<CheckSquare className="h-4 w-4" />
										</div>
									) : (
										<div className="flex items-center gap-1 text-gray-400" title="Sin checklist">
											<CheckSquare className="h-4 w-4" />
										</div>
									)}
								</div>
							</div>
							{onDeleteWork && isAuthorized && (
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 sm:h-8 sm:w-8"
									onClick={(e) => {
										e.stopPropagation();
										onDeleteWork(work);
									}}
								>
									<Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
								</Button>
							)}
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-3 sm:pt-4">
				<div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-4">
					<div className="flex items-center gap-2 w-full">
						<Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
						<EditableField
							value={work.architect || ''}
							onSave={async (newValue) => {
								await handleUpdateWork(work.id, { architect: newValue });
							}}
							showEditButton={isAuthorized}
						/>
					</div>
					<div className="flex items-center gap-2 w-full">
						<BrickWall className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
						<EditableField
							value={work.furniture || ''}
							onSave={async (newValue) => {
								await handleUpdateWork(work.id, { furniture: newValue });
							}}
							showEditButton={isAuthorized}
						/>
					</div>
					<div className="flex items-center gap-2 w-full">
						<MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
						<EditableField
							value={work.locality || ''}
							onSave={async (newValue) => {
								await handleUpdateWork(work.id, { locality: newValue });
							}}
							showEditButton={isAuthorized}
						/>
					</div>
					<div className="flex items-center gap-2 w-full">
						<Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
						<span className="truncate">
							{work.created_at
								? format(new Date(work.created_at), 'PPP', { locale: es })
								: 'Sin fecha'}
						</span>
					</div>
					<div className="flex items-start gap-2 w-full sm:col-span-2">
						<FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
						<div className="flex-1 min-w-0">
							<EditableTextarea
								value={work.general_note || ''}
								onSave={async (newValue) => {
									if (!onUpdate) {
										throw new Error('update_not_available');
									}
									await handleUpdateWork(work.id, { general_note: newValue });
								}}
								formatDisplay={(value) => value || 'Sin detalles'}
								showEditButton={canEdit}
							/>
						</div>
					</div>
					<div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
						{isAuthorized && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => onOpenChecklist(work.id)}
								className="w-full sm:w-auto"
							>
								<ListChecks className="h-4 w-4 mr-2" />
								{hasChecklist ? 'Agregar Checklists' : 'Crear Checklists'}
							</Button>
						)}
						{onOpenBalance && isAuthorized && (
							<Popover open={balancePopoverOpen} onOpenChange={setBalancePopoverOpen}>
								<PopoverTrigger asChild>
									<Button variant="outline" size="sm" className="w-full sm:w-auto">
										<Wallet className="h-4 w-4 mr-2" />
										Saldos
									</Button>
								</PopoverTrigger>
								<PopoverContent align="end" className="p-1 w-72">
									<div className="px-2 py-2 text-xs font-medium text-muted-foreground">
										Saldos de la obra
									</div>
									{balances.length === 0 ? (
										<div className="px-2 py-3 text-sm text-muted-foreground text-center">
											No hay saldos asociados
										</div>
									) : (
										<div className="max-h-64 overflow-y-auto">
											{balances.map((balance) => {
												const budget = balance.budget;
												const label = budget
													? [budget.number, budget.type].filter(Boolean).join(' · ')
													: 'Saldo sin presupuesto';
												return (
													<button
														key={balance.id}
														type="button"
														onClick={() => {
															onOpenBalance(work.id, balance.id);
															setBalancePopoverOpen(false);
														}}
														className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-left text-sm hover:bg-muted cursor-pointer"
													>
														<span className="truncate">{label}</span>
														<span className="text-xs text-muted-foreground whitespace-nowrap">
															{formatCurrency(budget?.amount_ars ?? 0)}
														</span>
													</button>
												);
											})}
										</div>
									)}
								</PopoverContent>
							</Popover>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsFilesDialogOpen(true)}
							className="w-full sm:w-auto"
						>
							<Files className="h-4 w-4 mr-2" />
							Archivos
						</Button>
					</div>
				</div>
			</CardContent>

			<WorkFilesDialog work={work} open={isFilesDialogOpen} onOpenChange={setIsFilesDialogOpen} />
		</Card>
	);
}
