'use client';

import { CalendarClock, CheckCircle2, PenLine, Plane } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { AttentionTile } from '@/components/dashboard/attention-tile';
import { PENDING_ACTION_ROUTES } from '@/constants/dashboard/dashboard';
import type { PendingActions } from '@/lib/dashboard/pending-actions';

interface NeedsAttentionProps {
	pending: PendingActions;
	isLoading: boolean;
}

/**
 * Everything blocked on an admin decision, in one place.
 * Only what actually needs attention is shown: a row of zeros teaches nothing
 * and pushes the useful part of the panel down.
 */
export function NeedsAttention({ pending, isLoading }: NeedsAttentionProps) {
	const tiles = [
		{
			key: 'appointments',
			count: pending.appointments,
			icon: CalendarClock,
			singular: 'cita esperando respuesta',
			plural: 'citas esperando respuesta',
			href: PENDING_ACTION_ROUTES.appointments,
			tone: 'text-chart-1',
		},
		{
			key: 'vacations',
			count: pending.vacations,
			icon: Plane,
			singular: 'pedido de vacaciones sin resolver',
			plural: 'pedidos de vacaciones sin resolver',
			href: PENDING_ACTION_ROUTES.vacations,
			tone: 'text-chart-2',
		},
		{
			key: 'signatures',
			count: pending.signatures,
			icon: PenLine,
			singular: 'presupuesto esperando firma',
			plural: 'presupuestos esperando firma',
			href: PENDING_ACTION_ROUTES.signatures,
			tone: 'text-chart-3',
		},
	].filter((tile) => tile.count > 0);

	if (isLoading) {
		return (
			<Card className="p-4">
				<p className="text-sm text-muted-foreground">Revisando pendientes...</p>
			</Card>
		);
	}

	if (tiles.length === 0) {
		return (
			<Card className="flex items-center gap-3 p-4">
				<CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
				<div>
					<p className="text-sm font-medium text-foreground">No hay nada esperándote</p>
					<p className="text-xs text-muted-foreground">
						Ninguna cita, pedido de vacaciones ni firma quedó sin resolver.
					</p>
				</div>
			</Card>
		);
	}

	return (
		<div className="space-y-2">
			<h3 className="text-sm font-medium text-muted-foreground">Necesita tu atención</h3>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{tiles.map((tile) => (
					<AttentionTile
						key={tile.key}
						icon={tile.icon}
						count={tile.count}
						singular={tile.singular}
						plural={tile.plural}
						href={tile.href}
						tone={tile.tone}
					/>
				))}
			</div>
		</div>
	);
}
