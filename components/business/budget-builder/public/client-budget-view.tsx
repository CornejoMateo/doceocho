'use client';

import { useEffect, useState } from 'react';
import { Check, FileDown, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { decodeClientBudget, type ClientBudget } from '@/helpers/budget-builder/share';
import { finishLabel } from '@/helpers/budget-builder/calculate';
import { downloadBudgetPdf } from '@/helpers/budget-builder/pdf';
import { formatCurrency } from '@/utils/formats-money';
import { Furniture3D } from '@/components/business/budget-builder/furniture-3d';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** Opens WhatsApp to the business with the message already written: one tap for the client. */
function whatsAppUrl(phone: string, text: string) {
	return `https://wa.me/${onlyDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function ClientBudgetView() {
	const [data, setData] = useState<ClientBudget | null>(null);
	const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');

	// The budget travels in the link's hash, which never reaches the server.
	useEffect(() => {
		const token = window.location.hash.slice(1);
		if (!token) {
			setStatus('invalid');
			return;
		}
		decodeClientBudget(token).then((decoded) => {
			setData(decoded);
			setStatus(decoded ? 'ready' : 'invalid');
		});
	}, []);

	if (status === 'loading') {
		return <p className="text-sm text-muted-foreground">Cargando presupuesto...</p>;
	}

	if (status === 'invalid' || !data) {
		return (
			<Card className="p-6 text-center text-sm text-muted-foreground">
				No pudimos abrir este presupuesto. Pedile a quien te lo envió que te comparta el link de nuevo.
			</Card>
		);
	}

	const phone = data.company.phone;
	const approveText = `Hola! Apruebo el presupuesto ${data.code}${data.clientName ? ` a nombre de ${data.clientName}` : ''} por ${formatCurrency(data.total)}.`;
	const askText = `Hola! Tengo una consulta sobre el presupuesto ${data.code}.`;

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
				<div>
					<p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Presupuesto</p>
					<p className="text-xl font-semibold text-foreground">{data.code}</p>
				</div>
				<div className="text-right text-sm text-muted-foreground">
					{data.clientName && <p className="text-foreground">{data.clientName}</p>}
					<p>{new Date(data.createdAt).toLocaleDateString('es-AR')}</p>
				</div>
			</div>

			{data.items.map((item, index) => (
				<section key={index} className="space-y-3">
					<Furniture3D
						shape={item.shape}
						dimensions={item.dimensions}
						finish={item.finish}
						className="h-72 sm:h-96"
					/>
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="space-y-1">
							<p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
								{String(index + 1).padStart(2, '0')}
							</p>
							<h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
							<p className="text-sm text-muted-foreground">
								{item.dimensions.width} × {item.dimensions.depth} × {item.dimensions.height} cm ·{' '}
								{finishLabel(item.finish)}
								{item.units > 1 ? ` · ${item.units} unidades` : ''}
							</p>
							{item.notes && <p className="max-w-prose text-sm text-muted-foreground">{item.notes}</p>}
						</div>
						<p className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(item.price)}</p>
					</div>
				</section>
			))}

			<div className="space-y-2 border-t border-border pt-4">
				<div className="flex items-baseline justify-between">
					<span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total</span>
					<span className="text-2xl font-semibold tabular-nums text-foreground">
						{formatCurrency(data.total)}
					</span>
				</div>
				<p className="text-xs text-muted-foreground">Válido por {data.validityDays} días desde su emisión.</p>
				{data.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">{data.notes}</p>}
			</div>

			<div className="flex flex-col gap-2 sm:flex-row">
				{phone && (
					<>
						<Button asChild className="gap-2">
							<a href={whatsAppUrl(phone, approveText)} target="_blank" rel="noopener noreferrer">
								<Check className="h-4 w-4" />
								Aprobar presupuesto
							</a>
						</Button>
						<Button asChild variant="outline" className="gap-2">
							<a href={whatsAppUrl(phone, askText)} target="_blank" rel="noopener noreferrer">
								<MessageCircle className="h-4 w-4" />
								Hacer una consulta
							</a>
						</Button>
					</>
				)}
				<Button variant="outline" className="gap-2" onClick={() => downloadBudgetPdf(data)}>
					<FileDown className="h-4 w-4" />
					Descargar PDF
				</Button>
			</div>
		</div>
	);
}
