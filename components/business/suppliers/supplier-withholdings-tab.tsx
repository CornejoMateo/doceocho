'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	isValidPeriod,
	listWithholdings,
	type WithholdingRow,
} from '@/lib/withholdings/withholdings';
import { listSuppliers, type Supplier } from '@/lib/suppliers/suppliers';
import { translateError } from '@/lib/error-translator';

const ALL_SUPPLIERS = '__all__';
const PERIOD_DEBOUNCE_MS = 400;

interface SupplierWithholdingsTabProps {
	suppliers?: Supplier[];
	refreshToken?: number;
}

const formatMoney = (value: number) =>
	`$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatRate = (rate: number) =>
	`${(rate * 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

export function SupplierWithholdingsTab({
	suppliers: suppliersProp,
	refreshToken,
}: SupplierWithholdingsTabProps) {
	const [period, setPeriod] = useState('');
	const [debouncedPeriod, setDebouncedPeriod] = useState('');
	const [supplierId, setSupplierId] = useState<string>(ALL_SUPPLIERS);

	const [suppliers, setSuppliers] = useState<Supplier[]>(suppliersProp ?? []);
	const [rows, setRows] = useState<WithholdingRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	useEffect(() => {
		const id = setTimeout(() => setDebouncedPeriod(period), PERIOD_DEBOUNCE_MS);
		return () => clearTimeout(id);
	}, [period]);

	useEffect(() => {
		if (suppliersProp) {
			setSuppliers(suppliersProp);
			return;
		}
		listSuppliers().then(({ data }) => setSuppliers(data ?? []));
	}, [suppliersProp]);

	const periodHint = debouncedPeriod && !isValidPeriod(debouncedPeriod);

	const fetchRows = async () => {
		const requestId = ++requestIdRef.current;
		setLoading(true);
		const { data, error } = await listWithholdings({
			period: isValidPeriod(debouncedPeriod) ? debouncedPeriod : undefined,
			supplierId: supplierId !== ALL_SUPPLIERS ? Number(supplierId) : undefined,
		});
		if (requestId !== requestIdRef.current) return;
		if (error) {
			setError(translateError(error) || 'No se pudieron cargar las retenciones.');
			setLoading(false);
			return;
		}
		setError(null);
		setRows(data ?? []);
		setLoading(false);
	};

	useEffect(() => {
		void fetchRows();
	}, [debouncedPeriod, supplierId, refreshToken]);

	const totalImputed = rows.reduce((sum, r) => sum + r.imputed_amount, 0);
	const totalWithheld = rows.reduce((sum, r) => sum + r.withheld_amount, 0);
	const totalAmount = rows.reduce((sum, r) => sum + r.total_amount, 0);

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<div className="space-y-1.5 sm:w-[160px]">
					<Label htmlFor="withholdings-period">Período</Label>
					<Input
						id="withholdings-period"
						placeholder="AAAA-MM"
						maxLength={7}
						value={period}
						onChange={(e) => setPeriod(e.target.value)}
					/>
					{periodHint && <p className="text-xs text-muted-foreground">Formato esperado: AAAA-MM</p>}
				</div>
				<div className="space-y-1.5 sm:w-[240px]">
					<Label htmlFor="withholdings-supplier">Proveedor</Label>
					<Select value={supplierId} onValueChange={setSupplierId}>
						<SelectTrigger id="withholdings-supplier">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL_SUPPLIERS}>Todos los proveedores</SelectItem>
							{suppliers.map((s) => (
								<SelectItem key={s.id} value={String(s.id)}>
									{s.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{loading ? (
				<Card className="p-8 text-center text-muted-foreground">Cargando retenciones...</Card>
			) : error ? (
				<Card className="p-8 text-center space-y-3">
					<p className="text-destructive">{error}</p>
					<Button variant="outline" onClick={() => fetchRows()}>
						Reintentar
					</Button>
				</Card>
			) : (
				<Card className="bg-card border-border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="text-center">Fecha</TableHead>
								<TableHead className="text-center">Proveedor</TableHead>
								<TableHead className="text-center">Período</TableHead>
								<TableHead className="text-center">Régimen</TableHead>
								<TableHead className="text-center">Imputado</TableHead>
								<TableHead className="text-center">Alícuota</TableHead>
								<TableHead className="text-center">Retenido</TableHead>
								<TableHead className="text-center">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
										No hay retenciones registradas
									</TableCell>
								</TableRow>
							) : (
								rows.map((r) => (
									<TableRow key={r.id}>
										<TableCell className="text-center">{r.date}</TableCell>
										<TableCell className="text-center">
											{r.supplier_name ?? (
												<span className="text-muted-foreground">Sin proveedor</span>
											)}
										</TableCell>
										<TableCell className="text-center">{r.period}</TableCell>
										<TableCell className="text-center">{r.tax_regime ?? '-'}</TableCell>
										<TableCell className="text-center">{formatMoney(r.imputed_amount)}</TableCell>
										<TableCell className="text-center">{formatRate(r.rate)}</TableCell>
										<TableCell className="text-center">{formatMoney(r.withheld_amount)}</TableCell>
										<TableCell className="text-center">{formatMoney(r.total_amount)}</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell className="text-center" colSpan={4}>
									Total
								</TableCell>
								<TableCell className="text-center">{formatMoney(totalImputed)}</TableCell>
								<TableCell className="text-center" />
								<TableCell className="text-center">{formatMoney(totalWithheld)}</TableCell>
								<TableCell className="text-center">{formatMoney(totalAmount)}</TableCell>
							</TableRow>
						</TableFooter>
					</Table>
				</Card>
			)}
		</div>
	);
}
