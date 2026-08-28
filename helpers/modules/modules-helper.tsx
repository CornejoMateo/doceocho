import { Module } from '@/lib/modules/modules';
import { Badge } from '@/components/ui/badge';
import { ModuleStatus } from '@/constants/modules/module-status';
import { cn } from '@/lib/utils';

export const getModuleWorkLabel = (module: Module): string => {
	const w = module.works;
	if (!w) return module.work_name || 'Sin obra';
	return (
		[w.locality, w.address, w.hood, w.zone].filter(Boolean).join(' - ') ||
		w.name ||
		module.work_name ||
		`Obra #${module.work_id}`
	);
};

const STATUS_CONFIG: Record<ModuleStatus, { label: string; className: string }> = {
	not_send: {
		label: 'No enviado',
		className: 'bg-muted text-muted-foreground border-border',
	},
	pending: {
		label: 'Pendiente',
		className: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
	},
	approved: {
		label: 'Aprobado',
		className: 'bg-green-500/15 text-green-600 border-green-500/30',
	},
	rejected: {
		label: 'Rechazado',
		className: 'bg-red-500/15 text-red-600 border-red-500/30',
	},
};

export function ModuleStatusBadge({
	status,
	className,
}: {
	status?: string | null;
	className?: string;
}) {
	const config = STATUS_CONFIG[(status as ModuleStatus) ?? 'not_send'] ?? STATUS_CONFIG.not_send;

	return (
		<Badge variant="secondary" className={cn(config.className, className)}>
			{config.label}
		</Badge>
	);
}
