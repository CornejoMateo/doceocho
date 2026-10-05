'use client';

import { useEffect, useRef, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Supplier, SupplierInput, createSupplier, updateSupplier } from '@/lib/suppliers/suppliers';
import { isDuplicateTaxIdError } from '@/helpers/suppliers/suppliers';
import { formatCuit, onlyDigits } from '@/lib/suppliers/validation';
import { translateError } from '@/lib/error-translator';
import {
	SUPPLIER_ADDRESS_MAX_LENGTH,
	SUPPLIER_EMAIL_MAX_LENGTH,
	SUPPLIER_LABELS,
	SUPPLIER_LOCALITY_MAX_LENGTH,
	SUPPLIER_MAX_PAYMENT_TERMS_DAYS,
	SUPPLIER_NAME_MAX_LENGTH,
	SUPPLIER_NOTES_MAX_LENGTH,
} from '@/constants/suppliers/suppliers';

interface SupplierFormDialogProps {
	open: boolean;
	supplier: Supplier | null;
	onOpenChange: (open: boolean) => void;
	onSaved: () => void | Promise<void>;
}

export function SupplierFormDialog({
	open,
	supplier,
	onOpenChange,
	onSaved,
}: SupplierFormDialogProps) {
	const { toast } = useToast();
	const [name, setName] = useState('');
	const [businessName, setBusinessName] = useState('');
	const [taxId, setTaxId] = useState('');
	const [whatsapp, setWhatsapp] = useState('');
	const [email, setEmail] = useState('');
	const [category, setCategory] = useState('');
	const [locality, setLocality] = useState('');
	const [address, setAddress] = useState('');
	const [paymentTerms, setPaymentTerms] = useState('');
	const [notes, setNotes] = useState('');
	const [isActive, setIsActive] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Keep the last supplier so the title doesn't flash "Nuevo proveedor" while closing.
	const lastSupplier = useRef<Supplier | null>(supplier);
	if (open) lastSupplier.current = supplier;
	const isEditing = !!(open ? supplier : lastSupplier.current);

	// Reset the fields every time the dialog opens or the supplier changes.
	useEffect(() => {
		if (!open) return;
		setName(supplier?.name ?? '');
		setBusinessName(supplier?.business_name ?? '');
		setTaxId(formatCuit(supplier?.tax_id));
		setWhatsapp(supplier?.whatsapp ?? '');
		setEmail(supplier?.email ?? '');
		setCategory(supplier?.category ?? '');
		setLocality(supplier?.locality ?? '');
		setAddress(supplier?.address ?? '');
		setPaymentTerms(
			supplier?.payment_terms_days != null ? String(supplier.payment_terms_days) : ''
		);
		setNotes(supplier?.notes ?? '');
		setIsActive(supplier?.is_active ?? true);
	}, [open, supplier]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		if (!name.trim()) {
			toast({
				title: 'Datos incompletos',
				description: 'Completá el nombre del proveedor.',
				variant: 'destructive',
			});
			return;
		}
		if (taxId.trim() && onlyDigits(taxId).length !== 11) {
			toast({
				title: 'CUIT inválido',
				description: 'El CUIT debe tener 11 dígitos.',
				variant: 'destructive',
			});
			return;
		}

		const orNull = (v: string) => (v.trim() ? v.trim() : null);
		// is_active is deliberately not part of this payload: edits never change the state.
		const payload: Omit<SupplierInput, 'is_active'> = {
			name: name.trim(),
			business_name: orNull(businessName),
			tax_id: taxId.trim() ? onlyDigits(taxId) : null,
			whatsapp: orNull(whatsapp),
			email: orNull(email),
			category: orNull(category),
			locality: orNull(locality),
			address: orNull(address),
			payment_terms_days: paymentTerms.trim() ? Number(paymentTerms) : null,
			notes: orNull(notes),
		};

		setIsSubmitting(true);
		try {
			const { error } = supplier
				? await updateSupplier(supplier.id, payload)
				: await createSupplier({ ...payload, is_active: isActive });
			if (error) throw error;
			toast({
				title: supplier ? 'Proveedor actualizado' : 'Proveedor creado',
				description: supplier
					? 'El proveedor se actualizó correctamente.'
					: 'El proveedor se creó correctamente.',
			});
			await onSaved();
		} catch (error) {
			toast({
				title: 'Error',
				description: isDuplicateTaxIdError(error)
					? 'Ya existe un proveedor con ese CUIT.'
					: translateError(error) || 'No se pudo guardar el proveedor.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o && isSubmitting) return;
				onOpenChange(o);
			}}
		>
			<DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
					<DialogDescription>
						{isEditing ? 'Modificá los datos del proveedor' : 'Cargá los datos del nuevo proveedor'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="supplier-name">Nombre comercial *</Label>
						<Input
							id="supplier-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={SUPPLIER_NAME_MAX_LENGTH}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="supplier-business-name">Razón social</Label>
						<Input
							id="supplier-business-name"
							value={businessName}
							onChange={(e) => setBusinessName(e.target.value)}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="supplier-tax-id">CUIT</Label>
							<Input
								id="supplier-tax-id"
								placeholder="XX-XXXXXXXX-X"
								inputMode="numeric"
								value={taxId}
								onChange={(e) => setTaxId(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="supplier-category">Rubro</Label>
							<Input
								id="supplier-category"
								value={category}
								onChange={(e) => setCategory(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="supplier-whatsapp">WhatsApp</Label>
							<Input
								id="supplier-whatsapp"
								type="tel"
								placeholder="Ej: 5491112345678"
								value={whatsapp}
								onChange={(e) => setWhatsapp(e.target.value)}
								maxLength={20}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="supplier-email">Email</Label>
							<Input
								id="supplier-email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								maxLength={SUPPLIER_EMAIL_MAX_LENGTH}
							/>
						</div>
					</div>

					<fieldset className="space-y-4 rounded-md border border-border p-4">
						<legend className="px-1 text-sm font-medium">Ubicación</legend>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="supplier-locality">Localidad</Label>
								<Input
									id="supplier-locality"
									value={locality}
									onChange={(e) => setLocality(e.target.value)}
									maxLength={SUPPLIER_LOCALITY_MAX_LENGTH}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="supplier-address">Dirección</Label>
								<Input
									id="supplier-address"
									value={address}
									onChange={(e) => setAddress(e.target.value)}
									maxLength={SUPPLIER_ADDRESS_MAX_LENGTH}
								/>
							</div>
						</div>
					</fieldset>

					<div className="space-y-2">
						<Label htmlFor="supplier-terms">Condición de pago (días)</Label>
						<Input
							id="supplier-terms"
							type="number"
							min={0}
							max={SUPPLIER_MAX_PAYMENT_TERMS_DAYS}
							step={1}
							placeholder="Ej: 30"
							value={paymentTerms}
							onChange={(e) => setPaymentTerms(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="supplier-notes">Notas</Label>
						<Textarea
							id="supplier-notes"
							rows={3}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							maxLength={SUPPLIER_NOTES_MAX_LENGTH}
						/>
					</div>

					{supplier ? (
						<div className="flex flex-wrap items-center gap-2">
							<Label>Estado</Label>
							<Badge variant={supplier.is_active ? 'default' : 'outline'}>
								{supplier.is_active ? SUPPLIER_LABELS.active : SUPPLIER_LABELS.inactive}
							</Badge>
							<span className="text-xs text-muted-foreground">
								Para cambiar el estado usá el botón de la lista.
							</span>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<Switch id="supplier-active" checked={isActive} onCheckedChange={setIsActive} />
							<Label htmlFor="supplier-active">Proveedor activo</Label>
						</div>
					)}

					<div className="flex gap-2">
						<Button type="submit" disabled={isSubmitting} className="flex-1">
							{isSubmitting ? 'Guardando...' : supplier ? 'Actualizar' : 'Crear'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancelar
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
