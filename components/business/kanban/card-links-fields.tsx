'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { ClientSelect } from '@/components/ui/client-select';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { getWorksByClientId, type Work } from '@/lib/works/works';

const NO_WORK_VALUE = 'none';

export type CardLinks = {
	clientId: number | null;
	workId: number | null;
};

interface CardLinksFieldsProps {
	value: CardLinks;
	onChange: (links: CardLinks) => void;
	disabled?: boolean;
}

/**
 * Picks the client and the work a card is about.
 * The work list depends on the client, so choosing another client clears it:
 * a card must never point at a work that belongs to somebody else.
 */
export function CardLinksFields({ value, onChange, disabled }: CardLinksFieldsProps) {
	const [works, setWorks] = useState<Work[]>([]);
	const [isLoadingWorks, setIsLoadingWorks] = useState(false);

	useEffect(() => {
		let isActive = true;

		if (!value.clientId) {
			setWorks([]);
			return;
		}

		setIsLoadingWorks(true);

		getWorksByClientId(value.clientId).then(({ data }) => {
			if (!isActive) return;

			setWorks(data ?? []);
			setIsLoadingWorks(false);
		});

		return () => {
			isActive = false;
		};
	}, [value.clientId]);

	const handleClientChange = (clientId: number | null) => {
		onChange({ clientId, workId: null });
	};

	const handleWorkChange = (workValue: string) => {
		onChange({
			...value,
			workId: workValue === NO_WORK_VALUE ? null : Number(workValue),
		});
	};

	const workPlaceholder = !value.clientId
		? 'Elegí un cliente primero'
		: isLoadingWorks
			? 'Cargando obras...'
			: works.length === 0
				? 'Este cliente no tiene obras'
				: 'Sin obra';

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="grid gap-2">
				<Label>Cliente</Label>
				<ClientSelect
					value={value.clientId}
					onValueChange={handleClientChange}
					placeholder="Sin cliente"
					disabled={disabled}
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="card-work">Obra</Label>
				<Select
					value={value.workId ? String(value.workId) : NO_WORK_VALUE}
					onValueChange={handleWorkChange}
					disabled={disabled || !value.clientId || works.length === 0}
				>
					<SelectTrigger id="card-work">
						<SelectValue placeholder={workPlaceholder} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={NO_WORK_VALUE}>Sin obra</SelectItem>
						{works.map((work) => (
							<SelectItem key={work.id} value={String(work.id)}>
								{work.name || [work.locality, work.address].filter(Boolean).join(' · ')}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
