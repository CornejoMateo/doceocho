'use client';

import { useState, useEffect, useMemo } from 'react';
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Users,
	Plus,
	Search,
	MapPin,
	Phone,
	Mail,
	Eye,
	Edit,
	Trash2,
	AlertTriangle,
	IdCard,
} from 'lucide-react';
import { updateClient } from '@/lib/clients/clients';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Client, listClients, deleteClient } from '@/lib/clients/clients';
import { ClientsAddDialog } from '@/components/business/clients/clients-add-dialog';
import { ClientDetailsDialog } from '@/components/business/clients/client-details-dialog';
import { useOptimizedRealtime } from '@/hooks/use-optimized-realtime';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/provider/auth-provider';
import { translateError } from '@/lib/error-translator';
import { useClientBudgetsInfo } from '@/hooks/clients/use-client-budgets-info';
import { paginateAndFilter } from '@/utils/pagination';

export function ClientManagement() {
	const { toast } = useToast();
	const { user } = useAuth();
	const notIsAuthorized = user?.role === 'Taller';

	const {
		data: clients,
		loading,
		error,
		refresh,
	} = useOptimizedRealtime<Client>(
		'clients',
		async () => {
			const { data } = await listClients();
			return data ?? [];
		},
		'clients_cache'
	);

	const [searchTerm, setSearchTerm] = useState('');
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [selectedClient, setSelectedClient] = useState<Client | null>(null);
	const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
	const [viewingClient, setViewingClient] = useState<Client | null>(null);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 6;

	const handleEditClient = (client: Client) => {
		setSelectedClient(client);
		setIsEditDialogOpen(true);
	};

	const handleViewClient = (client: Client) => {
		setViewingClient(client);
		setIsViewDialogOpen(true);
	};

	const handleEditFromView = () => {
		if (viewingClient) {
			setSelectedClient(viewingClient);
			setIsViewDialogOpen(false);
			setIsEditDialogOpen(true);
		}
	};

	const handleClientUpdated = async () => {
		await refresh();
	};

	const handleUpdateClient = async (updatedClient: Client) => {
		try {
			await updateClient(updatedClient.id, updatedClient);
			await refresh();
			setIsEditDialogOpen(false);
			setSelectedClient(null);
		} catch (err) {
			console.error('Error actualizando cliente:', err);
		}
	};

	const handleDeleteClick = (client: Client) => {
		setClientToDelete(client);
	};

	const confirmDelete = async () => {
		if (!clientToDelete) return;

		const loadingToast = toast({
			title: 'Eliminando cliente...',
			description: 'Se están eliminando los archivos asociados. Esto puede tardar unos momentos.',
		});

		try {
			const { error } = await deleteClient(clientToDelete.id);
			if (error) {
				loadingToast.update({
					title: 'Error al eliminar',
					description: translateError(error),
					variant: 'destructive',
				} as any);
				return;
			}
			loadingToast.update({
				title: 'Cliente eliminado',
				description: `${clientToDelete.name} ${clientToDelete.last_name} ha sido eliminado correctamente.`,
			} as any);
			setClientToDelete(null);
			await refresh();
		} catch (err) {
			console.error('Error eliminando el cliente:', err);
			loadingToast.update({
				title: 'Error al eliminar',
				description: translateError(err),
				variant: 'destructive',
			} as any);
		}
	};

	const {
		filteredData: filteredClients,
		paginatedData: currentItems,
		totalPages,
		totalItems,
	} = useMemo(
		() =>
			paginateAndFilter(
				clients,
				searchTerm,
				currentPage,
				itemsPerPage,
				(client, search) =>
					client.name?.toLowerCase().includes(search) ||
					client.last_name?.toLowerCase().includes(search) ||
					client.locality?.toLowerCase().includes(search) ||
					false
			),
		[clients, searchTerm, currentPage, itemsPerPage]
	);

	const { info: clientBudgetsInfo, loading: budgetsLoading } = useClientBudgetsInfo(currentItems);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm]);

	return (
		<div className="space-y-6">
			{/* Delete Confirmation Dialog */}
			<Dialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="text-destructive flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							Eliminar cliente
						</DialogTitle>
						<DialogDescription>
							¿Estás seguro de que deseas eliminar a {clientToDelete?.name}{' '}
							{clientToDelete?.last_name}?
						</DialogDescription>
						<div className="text-sm text-muted-foreground">
							<p>Esta acción eliminará permanentemente todo lo asociado a este cliente:</p>
							<ul className="mt-2 list-inside list-disc space-y-0.5">
								<li>Eventos del calendario</li>
								<li>Archivos subidos</li>
								<li>Presupuestos</li>
								<li>Obras</li>
								<li>Saldos y transacciones</li>
							</ul>
							<p className="mt-2 font-medium text-destructive">Esta acción no se puede deshacer.</p>
						</div>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setClientToDelete(null)}>
							Cancelar
						</Button>
						<Button variant="destructive" onClick={confirmDelete}>
							<Trash2 className="mr-2 h-4 w-4" />
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground text-balance">Gestión de Clientes</h2>
					<p className="text-muted-foreground mt-1">Administración de clientes y contactos</p>
				</div>
				{!notIsAuthorized && (
					<Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
						<Plus className="h-4 w-4" />
						Nuevo cliente
					</Button>
				)}
				<ClientsAddDialog
					open={isAddDialogOpen}
					onOpenChange={setIsAddDialogOpen}
					onClientAdded={refresh}
				/>
				{selectedClient && (
					<ClientsAddDialog
						open={isEditDialogOpen}
						onOpenChange={setIsEditDialogOpen}
						clientToEdit={
							selectedClient
								? {
										id: selectedClient.id,
										name: selectedClient.name || '',
										last_name: selectedClient.last_name || '',
										email: selectedClient.email || '',
										phone_number: selectedClient.phone_number || '',
										locality: selectedClient.locality || '',
										contact_method: selectedClient.contact_method || '',
										referred_to: selectedClient.referred_to || '',
										identity_number: selectedClient.identity_number || '',
									}
								: undefined
						}
						onUpdateClient={handleUpdateClient}
					/>
				)}
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card className="p-6 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">Total clientes</p>
							<p className="text-2xl font-bold text-foreground mt-2">{clients.length}</p>
						</div>
						<div className="rounded-lg bg-secondary p-3 text-chart-1">
							<Users className="h-6 w-6" />
						</div>
					</div>
				</Card>
			</div>

			<Tabs defaultValue="clients" className="space-y-6">
				<TabsContent value="clients" className="space-y-6">
					{/* Search */}
					<Card className="p-4 bg-card border-border">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Buscar por nombre o localidad..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-9 bg-background"
							/>
						</div>
					</Card>

					{/* Clients grid */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{currentItems.length === 0 && !loading && !error && (
							<p className="text-center text-muted-foreground py-8 col-span-3">
								{searchTerm
									? `No se encontraron clientes con el término de búsqueda "${searchTerm}"`
									: 'No hay clientes registrados.'}
							</p>
						)}
						{loading && (
							<p className="text-center text-muted-foreground py-8 col-span-3">
								Cargando clientes...
							</p>
						)}
						{error && (
							<p className="text-center text-destructive py-8 col-span-3">
								Error al cargar clientes: {translateError(error)}
							</p>
						)}
						{!loading &&
							!error &&
							currentItems.map((client) => (
								<Card
									key={client.id}
									className="p-6 bg-card border-border hover:border-primary/50 transition-colors"
								>
									<div className="space-y-4">
										<div className="flex items-center justify-between w-full">
											<div className="flex items-center gap-3">
												<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
													<span className="font-semibold text-primary text-lg">
														{client.last_name
															?.split(' ')
															.map((n) => n[0])
															.join('')
															.toUpperCase()
															.slice(0, 2)}
														{client.name
															?.split(' ')
															.map((n) => n[0])
															.join('')
															.toUpperCase()
															.slice(0, 1)}
													</span>
												</div>
												<div>
													<h3 className="font-semibold text-foreground">
														{client.last_name} {client.name}
													</h3>
												</div>
											</div>
											{!notIsAuthorized && (
												<button
													onClick={() => handleDeleteClick(client)}
													className="text-muted-foreground hover:text-destructive transition-colors p-0.1 -mt-13 -mr-3"
													title="Eliminar cliente"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											)}
										</div>

										<div className="space-y-2 text-sm pt-2">
											{client.email && (
												<div className="flex items-center gap-2 text-muted-foreground">
													<Mail className="h-4 w-4" />
													<span className="truncate">{client.email}</span>
												</div>
											)}
											{client.phone_number && (
												<div className="flex items-center gap-2 text-muted-foreground">
													<Phone className="h-4 w-4" />
													<span>{client.phone_number}</span>
												</div>
											)}
											{client.locality && (
												<div className="flex items-center gap-2 text-muted-foreground">
													<MapPin className="h-4 w-4" />
													<span>{client.locality}</span>
												</div>
											)}
											{client.identity_number && (
												<div className="flex items-center gap-2 text-muted-foreground">
													<IdCard className="h-4 w-4" />
													<span>{client.identity_number}</span>
												</div>
											)}
										</div>

										{/* Budget information */}
										{!notIsAuthorized && (
											<div className="border-t pt-3 mt-3">
												<div className="flex items-center justify-between text-xs">
													<div className="flex items-center gap-1">
														<FileText className="h-3.5 w-3.5 text-muted-foreground" />
														<span className="text-muted-foreground">
															{clientBudgetsInfo[client.id]?.total || 0} presupuesto(s)
														</span>
													</div>
													{clientBudgetsInfo[client.id]?.chosen > 0 ? (
														<Badge variant="default" className="gap-1 text-xs h-5">
															<CheckCircle className="h-3 w-3" />
															{clientBudgetsInfo[client.id].chosen} elegido(s)
														</Badge>
													) : (
														<Badge variant="secondary" className="text-xs h-5">
															Sin elegidos
														</Badge>
													)}
												</div>
											</div>
										)}

										<div className="flex gap-2 pt-2">
											<Button
												variant="outline"
												size="sm"
												className="flex-1 gap-2 bg-transparent"
												onClick={() => handleViewClient(client)}
											>
												<Eye className="h-4 w-4" />
												Ver
											</Button>
											{!notIsAuthorized && (
												<Button
													variant="outline"
													size="sm"
													className="flex-1 gap-2 bg-transparent"
													onClick={() => handleEditClient(client)}
												>
													<Edit className="h-4 w-4" />
													Editar
												</Button>
											)}
										</div>
									</div>
								</Card>
							))}
					</div>

					{/* Pagination controls */}
					{filteredClients.length > itemsPerPage && (
						<div className="flex items-center justify-between px-2 mt-6">
							<div className="text-sm text-muted-foreground">
								Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredClients.length)}-
								{Math.min(currentPage * itemsPerPage, filteredClients.length)} de{' '}
								{filteredClients.length} clientes
							</div>

							<Pagination className="mx-0 w-auto">
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											className={
												currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
											}
										/>
									</PaginationItem>

									{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
										let pageNum = i + 1;
										if (totalPages > 5) {
											if (currentPage <= 3) {
												pageNum = i + 1;
											} else if (currentPage >= totalPages - 2) {
												pageNum = totalPages - 4 + i;
											} else {
												pageNum = currentPage - 2 + i;
											}
										}
										return (
											<PaginationItem key={pageNum}>
												<PaginationLink
													isActive={currentPage === pageNum}
													className="cursor-pointer"
													onClick={() => setCurrentPage(pageNum)}
												>
													{pageNum}
												</PaginationLink>
											</PaginationItem>
										);
									})}

									<PaginationItem>
										<PaginationNext
											onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
											className={
												currentPage === totalPages
													? 'pointer-events-none opacity-50'
													: 'cursor-pointer'
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					)}
				</TabsContent>
			</Tabs>

			<ClientDetailsDialog
				client={viewingClient}
				isOpen={isViewDialogOpen}
				onClose={() => setIsViewDialogOpen(false)}
				onEdit={handleEditFromView}
				onClientUpdated={handleClientUpdated}
			/>
		</div>
	);
}
