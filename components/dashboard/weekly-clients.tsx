import { Card } from '@/components/ui/card';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { getClientsThisWeek } from '@/lib/clients/clients';
import { Client } from '@/lib/clients/clients';
import { UserPlus } from 'lucide-react';
import { formatCreatedAt } from '@/utils/format-date';
import { useRouter } from 'next/navigation';

export function WeeklyClients() {
	const router = useRouter();
	const { data: clients, loading } = useOptimizedRealtime<Client>(
		'clients',
		async () => {
			const { data } = await getClientsThisWeek();
			return data ?? [];
		},
		'weekly_clients_cache'
	);

	const handleClientClick = (client: Client) => {
		router.push(`/clients?clientId=${client.id}`);
	};

	return (
		<Card className="p-4 min-w-0">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-sm font-medium text-muted-foreground">Clientes nuevos esta semana</h3>
				<span className="text-xs rounded-full bg-blue-500/10 text-blue-600 px-2 py-0.5">
					{clients.length}
				</span>
			</div>

			<div className="space-y-3 max-h-[500px] overflow-y-auto">
				{loading ? (
					<p className="text-sm text-muted-foreground">Cargando clientes...</p>
				) : clients.length > 0 ? (
					clients.map((client) => (
						<div
							key={client.id}
							className="group flex gap-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 transition hover:bg-blue-500/10 cursor-pointer"
							onClick={() => handleClientClick(client)}
						>
							<div className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
								<UserPlus className="h-5 w-5" />
							</div>

							<div className="flex-1 space-y-1 min-w-0">
								<div className="flex items-center justify-between gap-2">
									<p className="text-sm font-medium truncate">
										{client.name} {client.last_name}
									</p>
								</div>

								{client.locality && (
									<p className="text-sm text-muted-foreground truncate">{client.locality}</p>
								)}

								{client.phone_number && (
									<p className="text-xs text-muted-foreground truncate">{client.phone_number}</p>
								)}

								{client.created_at && (
									<p className="text-xs text-blue-600 pt-1">
										Creado el {formatCreatedAt(client.created_at)}
									</p>
								)}
							</div>
						</div>
					))
				) : (
					<p className="text-sm text-muted-foreground text-center">
						No hay clientes nuevos esta semana
					</p>
				)}
			</div>
		</Card>
	);
}
