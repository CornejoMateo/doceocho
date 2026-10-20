'use client';

import { useEffect, useState } from 'react';
import { Check, FileDown, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
	fetchPublicBudget,
	respondToBudget,
	type RecordedResponse,
} from '@/lib/budget-builder/public-client';
import type { ClientResponse } from '@/lib/budget-builder/types';
import { decodeClientBudget, type ClientBudget } from '@/helpers/budget-builder/share';
import { finishColor, finishLabel } from '@/helpers/budget-builder/calculate';
import { downloadBudgetPdf } from '@/helpers/budget-builder/pdf';
import { formatCurrency } from '@/utils/formats-money';
import { Furniture3D } from '@/components/business/budget-builder/furniture-3d';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

/** Opens WhatsApp to the business with the message already written: one tap for the client. */
function whatsAppUrl(phone: string, text: string) {
	return `https://wa.me/${onlyDigits(phone)}?text=${encodeURIComponent(text)}`;
}

/**
 * With a token the budget comes from the database and the answer is recorded.
 * Without one it is an old link that carries the budget in its hash (first test version).
 */
export function ClientBudgetView({ token }: { token?: string }) {
	const [data, setData] = useState<ClientBudget | null>(null);
	const [recorded, setRecorded] = useState<RecordedResponse | null>(null);
	const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');

	useEffect(() => {
		if (token) {
			fetchPublicBudget(token).then(({ data: loaded }) => {
				setData(loaded?.budget ?? null);
				setRecorded(loaded?.response ?? null);
				setStatus(loaded ? 'ready' : 'invalid');
			});
			return;
		}

		// The hash never reaches the server.
		const hash = window.location.hash.slice(1);
		if (!hash) {
			setStatus('invalid');
			return;
		}
		decodeClientBudget(hash).then((decoded) => {
			setData(decoded);
			setStatus(decoded ? 'ready' : 'invalid');
		});
	}, [token]);

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
						color={finishColor(item)}
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
								{finishLabel(item)}
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

			{token ? (
				<ResponsePanel
					token={token}
					recorded={recorded}
					onRecorded={setRecorded}
					askUrl={phone ? whatsAppUrl(phone, askText) : null}
					onDownload={() => downloadBudgetPdf(data)}
				/>
			) : (
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
			)}
		</div>
	);
}

interface ResponsePanelProps {
	token: string;
	recorded: RecordedResponse | null;
	onRecorded: (response: RecordedResponse) => void;
	askUrl: string | null;
	onDownload: () => void;
}

/** Approve in one tap; rejecting asks why, so the seller knows what to change. */
function ResponsePanel({ token, recorded, onRecorded, askUrl, onDownload }: ResponsePanelProps) {
	const [rejecting, setRejecting] = useState(false);
	const [comment, setComment] = useState('');
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const send = async (decision: ClientResponse) => {
		setSending(true);
		setError(null);
		const { data, error: sendError } = await respondToBudget(token, decision, comment);
		setSending(false);
		if (data) onRecorded(data);
		else setError(sendError);
	};

	const secondary = (
		<>
			{askUrl && (
				<Button asChild variant="outline" className="gap-2">
					<a href={askUrl} target="_blank" rel="noopener noreferrer">
						<MessageCircle className="h-4 w-4" />
						Hacer una consulta
					</a>
				</Button>
			)}
			<Button variant="outline" className="gap-2" onClick={onDownload}>
				<FileDown className="h-4 w-4" />
				Descargar PDF
			</Button>
		</>
	);

	if (recorded) {
		const approved = recorded.decision === 'aprobado';
		return (
			<div className="space-y-3">
				<Card className={`p-4 text-sm ${approved ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
					<p className="font-medium text-foreground">
						{approved ? '¡Gracias! Aprobaste este presupuesto' : 'Rechazaste este presupuesto'}
						{recorded.respondedAt
							? ` el ${new Date(recorded.respondedAt).toLocaleDateString('es-AR')}`
							: ''}
						.
					</p>
					<p className="mt-1 text-muted-foreground">
						{approved
							? 'Ya le avisamos al equipo; se van a comunicar con vos para coordinar.'
							: 'Ya le avisamos al equipo. Si querés, escribinos para ajustarlo.'}
					</p>
				</Card>
				<div className="flex flex-col gap-2 sm:flex-row">{secondary}</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{rejecting && (
				<Textarea
					value={comment}
					onChange={(event) => setComment(event.target.value)}
					placeholder="Contanos qué no te convence (opcional): medidas, terminación, precio..."
					className="min-h-20 text-sm"
					maxLength={1000}
				/>
			)}
			{error && <p className="text-sm text-destructive">{error}</p>}
			<div className="flex flex-col gap-2 sm:flex-row">
				{rejecting ? (
					<>
						<Button variant="destructive" disabled={sending} onClick={() => send('rechazado')}>
							{sending ? 'Enviando...' : 'Confirmar rechazo'}
						</Button>
						<Button variant="ghost" disabled={sending} onClick={() => setRejecting(false)}>
							Volver
						</Button>
					</>
				) : (
					<>
						<Button className="gap-2" disabled={sending} onClick={() => send('aprobado')}>
							<Check className="h-4 w-4" />
							{sending ? 'Enviando...' : 'Aprobar presupuesto'}
						</Button>
						<Button variant="outline" className="gap-2" onClick={() => setRejecting(true)}>
							<X className="h-4 w-4" />
							Rechazar
						</Button>
						{secondary}
					</>
				)}
			</div>
		</div>
	);
}
