'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BOARD_TEMPLATES } from '@/constants/kanban/board-templates';

interface BoardTemplateShortcutsProps {
	onApply: (templateId: string) => Promise<void>;
}

/**
 * Fills an empty board with the lists of a template in one click.
 * Blank is left out on purpose: the board is already blank.
 */
export function BoardTemplateShortcuts({ onApply }: BoardTemplateShortcutsProps) {
	const [applyingId, setApplyingId] = useState<string | null>(null);

	const templates = BOARD_TEMPLATES.filter((template) => template.lists.length > 0);

	const handleApply = async (templateId: string) => {
		setApplyingId(templateId);

		try {
			await onApply(templateId);
		} finally {
			setApplyingId(null);
		}
	};

	return (
		<div className="space-y-2">
			<p className="text-xs text-muted-foreground">O arrancá con una plantilla:</p>
			<div className="flex flex-wrap justify-center gap-2">
				{templates.map((template) => (
					<Button
						key={template.id}
						variant="outline"
						size="sm"
						className="gap-2"
						disabled={applyingId !== null}
						onClick={() => handleApply(template.id)}
						title={template.lists.join(' → ')}
					>
						<template.icon className="h-4 w-4" />
						{applyingId === template.id ? 'Creando...' : template.name}
					</Button>
				))}
			</div>
		</div>
	);
}
