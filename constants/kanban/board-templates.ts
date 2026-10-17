import { Boxes, ClipboardList, FileText, LayoutList, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type BoardTemplate = {
	id: string;
	name: string;
	/** One line saying what the template is for. */
	description: string;
	icon: LucideIcon;
	/** List names, in the order they are created. Empty means a blank board. */
	lists: string[];
};

/**
 * Starting points for a new board, so nobody has to invent the stages.
 * Plain data on purpose: changing a template is editing this file, and the
 * lists it creates are ordinary lists the user can rename or delete afterwards.
 */
export const BOARD_TEMPLATES: BoardTemplate[] = [
	{
		id: 'simple',
		name: 'Simple',
		description: 'Lo básico para cualquier trabajo.',
		icon: LayoutList,
		lists: ['Por hacer', 'En proceso', 'Terminado'],
	},
	{
		id: 'production',
		name: 'Producción de obra',
		description: 'Seguir una obra desde que entra al taller hasta que sale.',
		icon: Wrench,
		lists: ['Por hacer', 'En proceso', 'Control de calidad', 'Terminado'],
	},
	{
		id: 'budgets',
		name: 'Seguimiento de presupuestos',
		description: 'Ver en qué quedó cada presupuesto que mandaste.',
		icon: FileText,
		lists: ['Por presupuestar', 'Presupuesto enviado', 'Esperando respuesta', 'Cerrado'],
	},
	{
		id: 'supplies',
		name: 'Compra de insumos',
		description: 'Controlar qué falta pedir y qué ya llegó.',
		icon: Boxes,
		lists: ['Por pedir', 'Pedido', 'Recibido'],
	},
	{
		id: 'blank',
		name: 'En blanco',
		description: 'Armá las listas vos mismo.',
		icon: ClipboardList,
		lists: [],
	},
];

export const DEFAULT_BOARD_TEMPLATE_ID = 'simple';

export function getBoardTemplate(templateId: string): BoardTemplate | undefined {
	return BOARD_TEMPLATES.find((template) => template.id === templateId);
}
