'use client';

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Edit, Ban, RotateCcw, Trash2 } from 'lucide-react';
import { AddressLink } from '@/components/ui/address-link';
import { Supplier } from '@/lib/suppliers/suppliers';
import { isValidEmail, formatCuit, getWhatsappUrl } from '@/lib/suppliers/validation';
import { SUPPLIER_LABELS } from '@/constants/suppliers/suppliers';

interface SuppliersTableProps {
	suppliers: Supplier[];
	busy: boolean;
	onEdit: (supplier: Supplier) => void;
	onToggleActive: (supplier: Supplier) => void;
	onDelete: (supplier: Supplier) => void;
}

// If a cell value is null or empty, we display a dash '-'
const dash = <span className="text-muted-foreground">-</span>;

function WhatsappCell({ value }: { value: string | null }) {
	if (!value) return dash;
	return (
		<a
			href={getWhatsappUrl(value)}
			target="_blank"
			rel="noopener noreferrer"
			className="text-green-600 hover:underline"
		>
			{value}
		</a>
	);
}

function EmailCell({ value }: { value: string | null }) {
	if (!value) return dash;
	if (!isValidEmail(value)) return <span className="break-all">{value}</span>;
	return (
		<a href={`mailto:${value}`} className="hover:underline break-all">
			{value}
		</a>
	);
}

function LocationCell({ supplier }: { supplier: Supplier }) {
	if (supplier.address) {
		return (
			<AddressLink address={supplier.address} locality={supplier.locality} className="text-sm" />
		);
	}
	return supplier.locality ? <span>{supplier.locality}</span> : dash;
}

function terms(days: number | null) {
	if (days == null) return null;
	return days === 0 ? 'Contado' : `${days} días`;
}

export function SuppliersTable({
	suppliers,
	busy,
	onEdit,
	onToggleActive,
	onDelete,
}: SuppliersTableProps) {
	const actions = (s: Supplier, withLabel: boolean) => {
		const variant = withLabel ? 'outline' : 'ghost';
		const size = withLabel ? 'default' : 'sm';
		const cls = withLabel ? 'flex-1 gap-2' : '';
		return (
			<>
				<Button
					variant={variant}
					size={size}
					className={cls}
					aria-label={`Editar ${s.name}`}
					title={`Editar ${s.name}`}
					onClick={() => onEdit(s)}
					disabled={busy}
				>
					<Edit className="h-4 w-4" />
					{withLabel && 'Editar'}
				</Button>
				<Button
					variant={variant}
					size={size}
					className={cls}
					aria-label={`${s.is_active ? 'Desactivar' : 'Activar'} ${s.name}`}
					title={`${s.is_active ? 'Desactivar' : 'Activar'} ${s.name}`}
					onClick={() => onToggleActive(s)}
					disabled={busy}
				>
					{s.is_active ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
					{withLabel && (s.is_active ? 'Desactivar' : 'Activar')}
				</Button>
				<Button
					variant={variant}
					size={size}
					className={`text-destructive ${cls}`}
					aria-label={`Eliminar ${s.name}`}
					title={`Eliminar ${s.name}`}
					onClick={() => onDelete(s)}
					disabled={busy}
				>
					<Trash2 className="h-4 w-4" />
					{withLabel && 'Eliminar'}
				</Button>
			</>
		);
	};

	const badge = (s: Supplier) => (
		<Badge variant={s.is_active ? 'default' : 'outline'}>
			{s.is_active ? SUPPLIER_LABELS.active : SUPPLIER_LABELS.inactive}
		</Badge>
	);

	return (
		<>
			<div className="hidden md:block" data-testid="suppliers-desktop">
				<Card className="bg-card border-border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="text-center">Proveedor</TableHead>
								<TableHead className="text-center">CUIT</TableHead>
								<TableHead className="text-center">Rubro</TableHead>
								<TableHead className="text-center">Ubicación</TableHead>
								<TableHead className="text-center">WhatsApp</TableHead>
								<TableHead className="text-center">Email</TableHead>
								<TableHead className="text-center">Cond. de pago</TableHead>
								<TableHead className="text-center">Estado</TableHead>
								<TableHead className="text-center">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{suppliers.map((s) => (
								<TableRow key={s.id} className={s.is_active ? '' : 'opacity-60'}>
									<TableCell>
										<div className="font-medium text-center">{s.name}</div>
										{s.business_name && (
											<div className="text-xs text-muted-foreground text-center">
												{s.business_name}
											</div>
										)}
									</TableCell>
									<TableCell className="text-center">
										{s.tax_id ? formatCuit(s.tax_id) : dash}
									</TableCell>
									<TableCell className="text-center">{s.category ?? dash}</TableCell>
									<TableCell className="text-center">
										<LocationCell supplier={s} />
									</TableCell>
									<TableCell className="text-center">
										<WhatsappCell value={s.whatsapp} />
									</TableCell>
									<TableCell className="text-center">
										<EmailCell value={s.email} />
									</TableCell>
									<TableCell className="text-center">
										{terms(s.payment_terms_days) ?? dash}
									</TableCell>
									<TableCell className="text-center">{badge(s)}</TableCell>
									<TableCell className="text-center">
										<div className="flex justify-end gap-1">{actions(s, false)}</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			</div>

			<div className="md:hidden space-y-3" data-testid="suppliers-mobile">
				{suppliers.map((s) => (
					<Card
						key={s.id}
						className={`bg-card border-border p-4 space-y-3 ${s.is_active ? '' : 'opacity-60 bg-muted'}`}
					>
						<div className="flex items-start justify-between gap-2">
							<div>
								<div className="font-medium">{s.name}</div>
								{s.business_name && (
									<div className="text-xs text-muted-foreground">{s.business_name}</div>
								)}
							</div>
							{badge(s)}
						</div>
						<dl className="space-y-1 text-sm">
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">CUIT</dt>
								<dd>{s.tax_id ? formatCuit(s.tax_id) : dash}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Rubro</dt>
								<dd>{s.category ?? dash}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Ubicación</dt>
								<dd className="text-right">
									<LocationCell supplier={s} />
								</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">WhatsApp</dt>
								<dd>
									<WhatsappCell value={s.whatsapp} />
								</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Email</dt>
								<dd>
									<EmailCell value={s.email} />
								</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-muted-foreground">Cond. de pago</dt>
								<dd>{terms(s.payment_terms_days) ?? dash}</dd>
							</div>
						</dl>
						<div className="flex gap-2 pt-1">{actions(s, true)}</div>
					</Card>
				))}
			</div>
		</>
	);
}
