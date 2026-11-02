import {
	canEdit,
	getDefaultEdits,
	parseEditsInput,
	resolveEdits,
} from '@/helpers/permissions/edits';
import { ALL_VIEW_KEYS, getDefaultViews } from '@/helpers/permissions/views';

describe('helpers/permissions/edits', () => {
	test('before any customization admins edit everything they see', () => {
		expect(getDefaultEdits('Admin')).toEqual(getDefaultViews('Admin'));
	});

	test('before any customization other roles edit none of it, as today', () => {
		expect(getDefaultEdits('Taller')).toEqual([]);
		expect(getDefaultEdits('QR')).toEqual([]);
	});

	test('superadmin always edits everything, whatever is stored', () => {
		expect(resolveEdits('Superadmin', [])).toEqual(ALL_VIEW_KEYS);
	});

	test('a customization replaces the role defaults', () => {
		expect(resolveEdits('Admin', ['clients'])).toEqual(['clients']);
		expect(resolveEdits('Taller', null)).toEqual([]);
	});

	test('editing needs the view too, and a tab needs its module', () => {
		expect(canEdit(['clients', 'clients.budgets'], ['clients.budgets'], 'clients.budgets')).toBe(
			true
		);
		expect(canEdit(['clients'], ['clients.budgets'], 'clients.budgets')).toBe(false);
		expect(canEdit(['clients.budgets'], ['clients.budgets'], 'clients.budgets')).toBe(false);
		expect(canEdit(['clients', 'clients.budgets'], [], 'clients.budgets')).toBe(false);
	});

	test('parsing follows the same rules as views', () => {
		expect(parseEditsInput(undefined, 'Taller')).toEqual({});
		expect(parseEditsInput(null, 'Taller')).toEqual({ edits: null });
		expect(parseEditsInput(['kanban'], 'Superadmin')).toEqual({ edits: null });
		expect(parseEditsInput(['kanban', 'nope'], 'Taller')).toEqual({ edits: ['kanban'] });
		expect(parseEditsInput('kanban', 'Taller').error).toBeDefined();
	});

	test('an empty edit list is valid: someone who only looks', () => {
		expect(parseEditsInput([], 'Admin')).toEqual({ edits: [] });
	});
});
