'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { AlertTriangle, Plus, Trash2, CheckCircle, FileText } from 'lucide-react';
import { Claim } from '@/lib/claims/claims';
import { ClaimsAddDialog } from '@/components/business/claims/claims-add-dialog';
import { ClaimImagesGallery } from '@/components/business/claims/claim-images-gallery';
import { ClaimsStats } from '@/components/business/claims/claim-stats';
import { ClaimsFilter } from '@/components/business/claims/claims-filter';
import { ClaimsTable } from '@/components/business/claims/claims-table';
import { useClaimsManagement } from '@/hooks/claims/use-claims-management';
import { useAuth } from '@/components/provider/auth-provider';

export function ClaimsManagement() {
	const {
		claims,
		paginatedData,
		loading,
		refresh,

		searchTerm,
		setSearchTerm,

		filterType,
		setFilterType,

		currentPage,
		setCurrentPage,
		itemsPerPage,
		totalPages,
		totalItems,

		isAddDialogOpen,
		setIsAddDialogOpen,

		isEditDialogOpen,
		setIsEditDialogOpen,

		selectedClaim,

		claimToDelete,
		setClaimToDelete,

		claimToResolve,
		setClaimToResolve,

		resolvedBy,
		setResolvedBy,

		descriptionToView,
		setDescriptionToView,

		selectedClaimForImages,
		setSelectedClaimForImages,

		showDeleteOldDialog,
		setShowDeleteOldDialog,

		handleEditClaim,
		handleDeleteClick,
		handleResolveClaim,
		handleReOpenClaim,

		confirmResolveClaim,
		confirmDelete,
		handleDeleteOldClaims,
	} = useClaimsManagement();

	const { user } = useAuth();

	return (
		<div className="space-y-6">
			{/* Delete Confirmation Dialog */}
			<Dialog open={!!claimToDelete} onOpenChange={(open) => !open && setClaimToDelete(null)}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="text-destructive flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							{filterType === 'diario' ? 'Eliminar actividad diaria' : 'Eliminar reclamo'}
						</DialogTitle>
						<DialogDescription>
							{filterType === 'diario'
								? '¿Estás seguro de que deseas eliminar esta actividad diaria? Esta acción no se puede deshacer.'
								: '¿Estás seguro de que deseas eliminar este reclamo? Esta acción no se puede deshacer.'}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setClaimToDelete(null)}>
							Cancelar
						</Button>
						<Button variant="destructive" onClick={confirmDelete}>
							<Trash2 className="mr-2 h-4 w-4" />
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Resolve Confirmation Dialog */}
			<Dialog open={!!claimToResolve} onOpenChange={(open) => !open && setClaimToResolve(null)}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CheckCircle className="h-5 w-5 text-green-600" />
							{filterType === 'diario'
								? 'Marcar actividad diaria como resuelta'
								: 'Marcar reclamo como resuelto'}
						</DialogTitle>
						<DialogDescription>
							{filterType === 'diario'
								? '¿Estás seguro de que deseas marcar esta actividad diaria como resuelta?'
								: '¿Estás seguro de que deseas marcar este reclamo como resuelto?'}
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Input
							value={resolvedBy}
							onChange={(e) => setResolvedBy(e.target.value)}
							className="bg-background"
							placeholder="¿Quien hablo con el cliente?"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setClaimToResolve(null)}>
							Cancelar
						</Button>
						<Button onClick={confirmResolveClaim} className="bg-green-600 hover:bg-green-700">
							<CheckCircle className="mr-2 h-4 w-4" />
							Marcar como resuelto/a
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Description View Dialog */}
			<Dialog
				open={!!descriptionToView}
				onOpenChange={(open) => {
					if (!open) {
						setDescriptionToView(null);
						setSelectedClaimForImages(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Descripción completa
						</DialogTitle>
					</DialogHeader>
					<DialogDescription className="sr-only">
						Descripción completa del reclamo o actividad diaria
					</DialogDescription>
					<div className="py-4 space-y-6">
						<div>
							<p className="text-sm text-foreground whitespace-pre-wrap">{descriptionToView}</p>
						</div>

						{selectedClaimForImages && (
							<div className="border-t pt-6">
								<ClaimImagesGallery
									claimId={selectedClaimForImages.id}
									clientId={selectedClaimForImages.client_id ?? null}
									claimDescription={selectedClaimForImages.description ?? null}
									workLocality={selectedClaimForImages.work_locality ?? null}
									workZone={selectedClaimForImages.work_zone ?? null}
									workAddress={selectedClaimForImages.work_address ?? null}
								/>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setDescriptionToView(null);
								setSelectedClaimForImages(null);
							}}
						>
							Cerrar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Old Claims Dialog */}
			<Dialog open={showDeleteOldDialog} onOpenChange={setShowDeleteOldDialog}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle className="text-destructive flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							Eliminar reclamos antiguos
						</DialogTitle>
						<DialogDescription>
							¿Estás seguro de que deseas eliminar todos los reclamos y actividades diarias que
							fueron resueltos hace más de un mes? Esta acción no se puede deshacer.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowDeleteOldDialog(false)}>
							Cancelar
						</Button>
						<Button variant="destructive" onClick={handleDeleteOldClaims}>
							<Trash2 className="mr-2 h-4 w-4" />
							Eliminar antiguos
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-foreground text-balance">
						Gestión de ajustes y actividades diarias
					</h2>
					<p className="text-muted-foreground mt-1">Administración de reclamos y seguimiento</p>
				</div>
				{user?.role === 'Admin' && (
					<Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
						<Plus className="h-4 w-4" />
						{filterType === 'diario' ? 'Agregar actividad diaria' : 'Agregar reclamo'}
					</Button>
				)}
			</div>

			<ClaimsAddDialog
				open={isAddDialogOpen}
				onOpenChange={setIsAddDialogOpen}
				onClaimAdded={refresh}
				mode={filterType === 'diario' ? 'diario' : 'reclamo'}
			/>

			{selectedClaim && (
				<ClaimsAddDialog
					open={isEditDialogOpen}
					onOpenChange={setIsEditDialogOpen}
					claimToEdit={selectedClaim}
					onClaimAdded={refresh}
					mode={selectedClaim.daily ? 'diario' : 'reclamo'}
				/>
			)}

			{/* Stats */}
			<ClaimsStats claims={claims} filterType={filterType} />

			{/* Filters and Search */}
			<ClaimsFilter
				filterType={filterType}
				setFilterType={setFilterType}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
			/>

			{/* Table */}
			<Card className="bg-card border-border">
				<div className="overflow-x-auto">
					<ClaimsTable
						claims={paginatedData}
						loading={loading}
						onEdit={handleEditClaim}
						onDelete={handleDeleteClick}
						onResolve={handleResolveClaim}
						onReOpen={handleReOpenClaim}
						authorizedUser={!!user && user.role === 'Admin'}
						filterType={filterType}
						onViewDescription={(description: string) => setDescriptionToView(description)}
						onViewImages={(claim: Claim) => setSelectedClaimForImages(claim)}
					/>
				</div>
			</Card>

			{/* Pagination */}
			<PaginationControls
				currentPage={currentPage}
				totalPages={totalPages}
				totalItems={totalItems}
				itemsPerPage={itemsPerPage}
				onPageChange={setCurrentPage}
				itemLabel={filterType === 'diario' ? 'actividades diarias' : 'reclamos'}
			/>

			{/* delete old claims */}
			{user?.role === 'Admin' && (
				<Card className="p-4 bg-card border-border">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-sm font-medium text-foreground">Limpiar datos antiguos</h3>
							<p className="text-xs text-muted-foreground mt-1">
								Elimina reclamos y actividades diarias resueltos hace más de un mes
							</p>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onClick={() => setShowDeleteOldDialog(true)}
							className="gap-2"
						>
							<Trash2 className="h-4 w-4" />
							Eliminar antiguos
						</Button>
					</div>
				</Card>
			)}
		</div>
	);
}
