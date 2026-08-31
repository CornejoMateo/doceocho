'use client';

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { MONTHS } from '@/constants/attendance/settlements';
import { translateError } from '@/lib/error-translator';
import { Module, getUserModulesForMonth } from '@/lib/modules/modules';
import { getModuleWorkLabel, ModuleStatusBadge } from '@/helpers/modules/modules-helper';
import { formatCreatedAt } from '@/utils/format-date';
import { getLocalDate } from '@/utils/format-date';
import { formatCurrency } from '@/utils/formats-money';
import { Spinner } from '@/components/ui/spinner';
import { ModuleDetailsModal } from '@/components/business/modules/module-details-modal';
import { User } from '@/lib/users/users';
import { SessionUser } from '@/components/provider/auth-provider';

interface LoadMoreModulesModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	users?: User[];
	user?: SessionUser | null;
}

export function LoadMoreModulesModal({
	open,
	onOpenChange,
	users = [],
	user = null,
}: LoadMoreModulesModalProps) {
	const currentYear = Number(getLocalDate().split('-')[0]);
	const currentMonth = Number(getLocalDate().split('-')[1]) - 1;
	const years = Array.from({ length: currentYear - 2025 + 1 }, (_, i) =>
		(currentYear - i).toString()
	);
	const [year, setYear] = useState(currentYear.toString());
	const [month, setMonth] = useState(currentMonth.toString());
	const [selectedUserId, setSelectedUserId] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [results, setResults] = useState<Module[] | null>(null);
	const [detailsModule, setDetailsModule] = useState<Module | null>(null);

	const targetUserId = user?.uid ?? selectedUserId;

	useEffect(() => {
		if (open) {
			setYear(currentYear.toString());
			setMonth(currentMonth.toString());
			setSelectedUserId('');
			setResults(null);
			setError(null);
		} else {
			setDetailsModule(null);
		}
	}, [open]);

	const handleAccept = async () => {
		if (!targetUserId) return;
		setLoading(true);
		setError(null);
		try {
			const { data, error } = await getUserModulesForMonth(
				targetUserId,
				Number(year),
				Number(month) + 1
			);
			if (error) {
				setError(translateError(error) || 'Error al cargar los módulos');
				return;
			}
			setResults(data || []);
		} catch (err: any) {
			setError(translateError(err) || 'Error al cargar los módulos');
		} finally {
			setLoading(false);
		}
	};

	const totalAmount = (results ?? []).reduce((acc, m) => acc + (m.amount ?? 0), 0);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[650px]">
					<DialogHeader>
						<DialogTitle>Cargar más módulos</DialogTitle>
						<DialogDescription>
							Selecciona el período para cargar sus módulos de obra
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="year-select">Año</Label>
								<Select value={year} onValueChange={setYear}>
									<SelectTrigger id="year-select">
										<SelectValue placeholder="Selecciona año" />
									</SelectTrigger>
									<SelectContent>
										{years.map((y) => (
											<SelectItem key={y} value={y}>
												{y}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label htmlFor="month-select">Mes</Label>
								<Select value={month} onValueChange={setMonth}>
									<SelectTrigger id="month-select">
										<SelectValue placeholder="Selecciona mes" />
									</SelectTrigger>
									<SelectContent>
										{MONTHS.map((m) => (
											<SelectItem key={m.value} value={m.value}>
												{m.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{!user && (
							<div className="space-y-2">
								<Label htmlFor="user-select">Usuario</Label>
								<Select value={selectedUserId} onValueChange={setSelectedUserId}>
									<SelectTrigger id="user-select">
										<SelectValue placeholder="Selecciona usuario" />
									</SelectTrigger>
									<SelectContent>
										{users.map(
											(u) =>
												u.role === 'Taller' && (
													<SelectItem key={u.uid_user} value={u.uid_user}>
														{u.name && u.last_name ? `${u.name} ${u.last_name}` : u.username}
													</SelectItem>
												)
										)}
									</SelectContent>
								</Select>
							</div>
						)}

						{loading && (
							<div className="text-center py-6 space-y-2">
								<Spinner className="mx-auto" />
								<div className="text-gray-500 text-sm">Cargando módulos...</div>
							</div>
						)}

						{!loading && error && (
							<div className="text-center py-6 space-y-3">
								<div className="text-red-500 text-sm">{error}</div>
								<Button onClick={handleAccept} variant="outline" size="sm" type="button">
									Reintentar
								</Button>
							</div>
						)}

						{!loading && !error && results && (
							<div className="space-y-2">
								<div className="flex items-center justify-between px-1">
									<div>
										<div className="font-medium text-sm">{user ? 'Mis módulos' : 'Módulos'}</div>
										<div className="text-xs text-gray-500">{results.length} módulo(s)</div>
									</div>
									{totalAmount > 0 && (
										<div className="text-right">
											<div className="font-bold text-sm text-blue-600">
												{formatCurrency(totalAmount)}
											</div>
											<div className="text-xs text-gray-500">total</div>
										</div>
									)}
								</div>

								{results.length === 0 ? (
									<div className="text-center py-6 text-gray-500 text-sm">
										No hay módulos registrados en el período seleccionado
									</div>
								) : (
									<div className="space-y-2 max-h-80 overflow-y-auto pr-2">
										{results.map((module) => (
											<button
												key={module.id}
												type="button"
												onClick={() => setDetailsModule(module)}
												className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg gap-2 cursor-pointer hover:bg-gray-100 text-left transition-colors"
											>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2 flex-wrap">
														<span className="font-medium text-sm">
															{module.title || 'Sin título'}
														</span>
														<ModuleStatusBadge status={module.status} />
													</div>
													<div className="text-xs text-gray-500">
														{getModuleWorkLabel(module)} · {formatCreatedAt(module.created_at)}
													</div>
												</div>
												{module.amount != null && (
													<div className="font-bold text-sm text-blue-600 shrink-0">
														{formatCurrency(module.amount)}
													</div>
												)}
											</button>
										))}
									</div>
								)}
							</div>
						)}
					</div>
					<DialogFooter>
						<div className="flex gap-2 w-full justify-end">
							<Button variant="outline" onClick={() => onOpenChange(false)} type="button">
								Cerrar
							</Button>
							<Button onClick={handleAccept} disabled={loading || !targetUserId} type="button">
								Cargar
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ModuleDetailsModal
				open={!!detailsModule}
				onOpenChange={(open) => !open && setDetailsModule(null)}
				module={detailsModule}
			/>
		</>
	);
}
