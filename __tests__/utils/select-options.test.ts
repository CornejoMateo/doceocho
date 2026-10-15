import { withInactiveSelected } from '@/utils/select-options';

type Option = { id: number; is_active: boolean; name: string };

const active: Option[] = [
	{ id: 1, is_active: true, name: 'Efectivo' },
	{ id: 2, is_active: true, name: 'Transferencia' },
];
const all: Option[] = [...active, { id: 3, is_active: false, name: 'Cheque (de baja)' }];

describe('withInactiveSelected', () => {
	it('returns only active options when not editing', () => {
		expect(withInactiveSelected(active, all, '3', false)).toBe(active);
	});

	it('returns only active options when editing but nothing is selected yet', () => {
		expect(withInactiveSelected(active, all, '', true)).toBe(active);
	});

	it('appends the inactive selected option when editing', () => {
		const result = withInactiveSelected(active, all, '3', true);

		expect(result).toEqual([...active, { id: 3, is_active: false, name: 'Cheque (de baja)' }]);
	});

	it('does not duplicate an already-active selected option', () => {
		const result = withInactiveSelected(active, all, '1', true);

		expect(result).toEqual(active);
	});

	it('does not append anything when the selected id does not exist at all', () => {
		const result = withInactiveSelected(active, all, '999', true);

		expect(result).toEqual(active);
	});
});
