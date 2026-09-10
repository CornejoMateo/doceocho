'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { CalendarDays, Clock, Plus } from 'lucide-react';
import { useAuth } from '@/components/provider/auth-provider';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { toast } from '@/components/ui/use-toast';
import { translateError } from '@/lib/error-translator';
import { listUsers, User } from '@/lib/users/users';
import {
	VacationRequest,
	deleteVacationRequest,
	listVacationRequests,
} from '@/lib/human-resources/vacation-requests';
import {
	countPendingRequests,
	countVacationDays,
	sortVacationRequests,
} from '@/helpers/human-resources/vacations';
import { VACATION_REQUESTS_PER_PAGE } from '@/constants/human-resources/vacations';
import { VacationRequestDialog } from '@/components/business/human-resources/vacations/vacation-request-dialog';
import { VacationReviewDialog } from '@/components/business/human-resources/vacations/vacation-review-dialog';
import { VacationRequestCard } from '@/components/business/human-resources/vacations/vacation-request-card';

export function VacationsTab() {
	const { user } = useAuth();
	const isAdmin = user?.role === 'Admin';

	const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
	const [requestToReview, setRequestToReview] = useState<VacationRequest | null>(null);
	const [requestToCancel, setRequestToCancel] = useState<VacationRequest | null>(null);
	const [isCancelling, setIsCancelling] = useState(false);
	const [teamPage, setTeamPage] = useState(1);

	// RLS scopes this: an admin gets every request, anyone else only their own.
	const {
		data: requests,
		loading,
		error,
		refresh,
	} = useOptimizedRealtime<VacationRequest>(
		'vacation_requests',
		async () => {
			const { data, error: listError } = await listVacationRequests();
			if (listError) throw listError;
			return data ?? [];
		},
		'vacation_requests_cache'
	);

	// Names are only needed on the admin list, and only admins can list users.
	const { data: users } = useOptimizedRealtime<User>(
		'users',
		async () => {
			const { data, error: listError } = await listUsers();
			if (listError) throw listError;
			return data ?? [];
		},
		'users_cache',
		isAdmin
	);

	const getRequesterName = (userId: string): string => {
		const requester = users.find((candidate) => candidate.uid_user === userId);

		if (!requester) return 'Empleado';

		return `${requester.last_name ?? ''} ${requester.name ?? ''}`.trim() || requester.username;
	};

	const myRequests = useMemo(
		() => sortVacationRequests(requests.filter((request) => request.user_id === user?.uid)),
		[requests, user?.uid]
	);

	const teamRequests = useMemo(() => sortVacationRequests(requests), [requests]);

	const pendingCount = useMemo(() => countPendingRequests(requests), [requests]);

	const myApprovedDays = useMemo(
		() =>
			myRequests
				.filter((request) => request.status === 'Aprobada')
				.reduce(
					(total, request) => total + countVacationDays(request.start_date, request.end_date),
					0
				),
		[myRequests]
	);

	const paginatedTeamRequests = useMemo(() => {
		const start = (teamPage - 1) * VACATION_REQUESTS_PER_PAGE;
		return teamRequests.slice(start, start + VACATION_REQUESTS_PER_PAGE);
	}, [teamRequests, teamPage]);

	const handleCancel = async () => {
		if (!requestToCancel) return;

		setIsCancelling(true);

		try {
			const { error: deleteError } = await deleteVacationRequest(requestToCancel.id);

			if (deleteError) {
				toast({
					variant: 'destructive',
					title: 'Error al cancelar el pedido',
					description: translateError(deleteError),
				});
				return;
			}

			toast({
				title: 'Pedido cancelado',
				description: 'Tu solicitud de vacaciones fue eliminada.',
			});

			setRequestToCancel(null);
			await refresh();
		} finally {
			setIsCancelling(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h3 className="text-xl font-bold text-foreground">Vacaciones</h3>
					<p className="text-muted-foreground mt-1">
						Pedí tus vacaciones y seguí el estado de cada solicitud
					</p>
				</div>
				<Button onClick={() => setIsRequestDialogOpen(true)} className="gap-2">
					<Plus className="h-4 w-4" />
					Pedir vacaciones
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								{isAdmin ? 'Pedidos pendientes' : 'Mis pedidos pendientes'}
							</p>
							<p className="text-2xl font-bold text-foreground mt-2">
								{isAdmin ? pendingCount : countPendingRequests(myRequests)}
							</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-1">
							<Clock className="h-6 w-6" />
						</div>
					</div>
				</Card>
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Mis días aprobados</p>
							<p className="text-2xl font-bold text-foreground mt-2">{myApprovedDays}</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-2">
							<CalendarDays className="h-6 w-6" />
						</div>
					</div>
				</Card>
			</div>

			<Card className="p-4 sm:p-6 bg-card border-border">
				<h4 className="font-semibold text-foreground mb-4">Mis pedidos</h4>

				{loading && <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>}
				{error && !loading && (
					<p className="text-sm text-destructive py-6 text-center">
						Error al cargar las vacaciones: {translateError(error)}
					</p>
				)}
				{!loading && !error && myRequests.length === 0 && (
					<p className="text-sm text-muted-foreground py-6 text-center">
						Todavía no pediste vacaciones.
					</p>
				)}
				{!loading && !error && myRequests.length > 0 && (
					<div className="space-y-2">
						{myRequests.map((request) => (
							<VacationRequestCard
								key={request.id}
								request={request}
								onCancel={
									request.status === 'Pendiente' ? () => setRequestToCancel(request) : undefined
								}
							/>
						))}
					</div>
				)}
			</Card>

			{isAdmin && (
				<Card className="p-4 sm:p-6 bg-card border-border">
					<div className="mb-4">
						<h4 className="font-semibold text-foreground">Pedidos del equipo</h4>
						<p className="text-sm text-muted-foreground">
							Los pendientes aparecen primero. Al aprobar o rechazar se notifica al empleado.
						</p>
					</div>

					{!loading && teamRequests.length === 0 ? (
						<p className="text-sm text-muted-foreground py-6 text-center">
							No hay pedidos de vacaciones.
						</p>
					) : (
						<div className="space-y-2">
							{paginatedTeamRequests.map((request) => (
								<VacationRequestCard
									key={request.id}
									request={request}
									requesterName={getRequesterName(request.user_id)}
									onReview={() => setRequestToReview(request)}
								/>
							))}
						</div>
					)}

					<PaginationControls
						currentPage={teamPage}
						totalPages={Math.ceil(teamRequests.length / VACATION_REQUESTS_PER_PAGE)}
						totalItems={teamRequests.length}
						itemsPerPage={VACATION_REQUESTS_PER_PAGE}
						onPageChange={setTeamPage}
						itemLabel="pedidos"
					/>
				</Card>
			)}

			<VacationRequestDialog
				open={isRequestDialogOpen}
				onOpenChange={setIsRequestDialogOpen}
				onCreated={refresh}
			/>

			<VacationReviewDialog
				request={requestToReview}
				allRequests={requests}
				requesterName={requestToReview ? getRequesterName(requestToReview.user_id) : ''}
				open={!!requestToReview}
				onOpenChange={(open) => !open && setRequestToReview(null)}
				onResolved={refresh}
			/>

			<ConfirmDialog
				open={!!requestToCancel}
				onOpenChange={(open) => !open && setRequestToCancel(null)}
				title="Cancelar pedido"
				description="Se va a eliminar tu solicitud de vacaciones. Esta acción no se puede deshacer."
				confirmText="Cancelar pedido"
				cancelText="Volver"
				onConfirm={handleCancel}
				isLoading={isCancelling}
			/>
		</div>
	);
}
