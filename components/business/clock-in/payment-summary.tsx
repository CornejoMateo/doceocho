'use client';

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { calculatePaymentSummary, PaymentSummary } from '@/lib/attendance/attendance';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { formatCurrency } from '@/utils/formats-money';
import { formatCreatedAt } from '@/utils/format-date';
import { DollarSign, Calendar } from 'lucide-react';

interface PaymentSummaryProps {
	userId: string | null;
	userName: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function PaymentSummaryModal({ userId, userName, open, onOpenChange }: PaymentSummaryProps) {
	const [summary, setSummary] = useState<PaymentSummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

	const loadSummary = async () => {
		if (!userId || !userName) return;

		setLoading(true);
		const { data, error } = await calculatePaymentSummary(userId, userName);

		if (error) {
			toast({
				title: 'Error',
				description: translateError(error) || 'No se pudo cargar el resumen de pagos',
				variant: 'destructive',
			});
		} else {
			setSummary(data);
		}
		setLoading(false);
	};

	useEffect(() => {
		if (open) {
			loadSummary();
		}
	}, [open, userId, userName]);

	if (!userId || !userName) {
		return null;
	}

	const formatMonth = (monthStr: string) => {
		const [year, month] = monthStr.split('-');
		return format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy', { locale: es });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<DollarSign className="h-5 w-5" />
						Resumen de Pagos
					</DialogTitle>
					<DialogDescription>
						{userName} - Cálculo basado en horas trabajadas y precios configurados
					</DialogDescription>
				</DialogHeader>
				{loading ? (
					<div className="text-center py-8 text-gray-500">Cargando...</div>
				) : !summary ? (
					<div className="text-center py-8 text-gray-500">
						No hay datos de asistencia disponibles
					</div>
				) : (
					<>
						<div className="flex gap-2 mb-4">
							<Button
								variant={activeTab === 'daily' ? 'default' : 'outline'}
								onClick={() => setActiveTab('daily')}
								size="sm"
							>
								Diario
							</Button>
							<Button
								variant={activeTab === 'weekly' ? 'default' : 'outline'}
								onClick={() => setActiveTab('weekly')}
								size="sm"
							>
								Semanal
							</Button>
							<Button
								variant={activeTab === 'monthly' ? 'default' : 'outline'}
								onClick={() => setActiveTab('monthly')}
								size="sm"
							>
								Mensual
							</Button>
						</div>

						{activeTab === 'daily' && (
							<div className="space-y-2">
								{summary.daily.length === 0 ? (
									<div className="text-center py-4 text-gray-500">No hay registros diarios</div>
								) : (
									summary.daily.map((day) => (
										<div
											key={day.date}
											className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
										>
											<div className="flex items-center gap-3">
												<Calendar className="h-4 w-4 text-gray-500" />
												<div>
													<div className="font-medium">{formatCreatedAt(day.date)}</div>
													<div className="text-sm text-gray-500">
														{day.regular_hours}h normales · {day.overtime_hours}h extras
													</div>
												</div>
											</div>
											<div className="font-semibold text-green-600">
												{formatCurrency(day.total_payment)}
											</div>
										</div>
									))
								)}
							</div>
						)}

						{activeTab === 'weekly' && (
							<div className="space-y-2">
								{summary.weekly.length === 0 ? (
									<div className="text-center py-4 text-gray-500">No hay registros semanales</div>
								) : (
									summary.weekly.map((week) => (
										<div
											key={week.week_start}
											className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
										>
											<div className="flex items-center gap-3">
												<Calendar className="h-4 w-4 text-gray-500" />
												<div>
													<div className="font-medium">
														{formatCreatedAt(week.week_start)} - {formatCreatedAt(week.week_end)}
													</div>
													<div className="text-sm text-gray-500">
														{week.regular_hours}h normales · {week.overtime_hours}h extras
													</div>
												</div>
											</div>
											<div className="font-semibold text-green-600">
												{formatCurrency(week.total_payment)}
											</div>
										</div>
									))
								)}
							</div>
						)}

						{activeTab === 'monthly' && (
							<div className="space-y-2">
								{summary.monthly.length === 0 ? (
									<div className="text-center py-4 text-gray-500">No hay registros mensuales</div>
								) : (
									summary.monthly.map((month) => (
										<div
											key={month.month}
											className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
										>
											<div className="flex items-center gap-3">
												<Calendar className="h-4 w-4 text-gray-500" />
												<div>
													<div className="font-medium capitalize">{formatMonth(month.month)}</div>
													<div className="text-sm text-gray-500">
														{month.regular_hours}h normales · {month.overtime_hours}h extras
													</div>
												</div>
											</div>
											<div className="font-semibold text-green-600">
												{formatCurrency(month.total_payment)}
											</div>
										</div>
									))
								)}
							</div>
						)}
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
