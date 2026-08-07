import { Card } from '@/components/ui/card';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getWorksThisWeek } from '@/lib/works/works';
import { Work } from '@/lib/works/works';
import { Building2 } from 'lucide-react';
import { formatCreatedAt } from '@/utils/format-date';
import { useRouter } from 'next/navigation';

export function WeeklyWorks() {
	const router = useRouter();
	const { data: works, loading } = useOptimizedRealtime<Work>(
		'works',
		async () => {
			const { data } = await getWorksThisWeek();
			return data ?? [];
		},
		'weekly_works_cache'
	);

	const handleWorkClick = (work: Work) => {
		router.push('/works');
	};

	return (
		<Card className="p-4 min-w-0">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-medium text-muted-foreground">Obras nuevas esta semana</h3>
				<span className="text-xs rounded-full bg-green-500/10 text-green-600 px-2 py-0.5">
					{works.length}
				</span>
			</div>

			<div className="space-y-3 max-h-[500px] overflow-y-auto">
				{loading ? (
					<p className="text-sm text-muted-foreground">Cargando obras...</p>
				) : works.length > 0 ? (
					works.map((work) => (
						<div
							key={work.id}
							className="group flex gap-4 rounded-xl border border-green-500/20 bg-green-500/5 p-4 transition hover:bg-green-500/10 cursor-pointer"
							onClick={() => handleWorkClick(work)}
						>
							<div className="flex items-center justify-center rounded-full bg-green-500/10 text-green-600">
								<Building2 className="h-5 w-5" />
							</div>

							<div className="flex-1 space-y-1 min-w-0">
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-medium truncate">{work.name || 'Sin nombre'}</p>
								</div>

								{work.locality && (
									<p className="text-sm text-muted-foreground truncate">{work.locality}</p>
								)}

								{work.address && (
									<p className="text-xs text-muted-foreground truncate">{work.address}</p>
								)}

								{work.client_name && work.client_last_name && (
									<p className="text-xs text-muted-foreground truncate">
										Cliente: {work.client_last_name}, {work.client_name}
									</p>
								)}

								{work.created_at && (
									<p className="text-xs text-green-600 pt-1">
										Creada el {formatCreatedAt(work.created_at)}
									</p>
								)}
							</div>
						</div>
					))
				) : (
					<p className="text-sm text-muted-foreground text-center">
						No hay obras nuevas esta semana
					</p>
				)}
			</div>
		</Card>
	);
}
