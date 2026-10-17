import { formatCardClientName, formatCardWorkName } from '@/helpers/kanban/card-links';

describe('helpers/kanban/card-links', () => {
	describe('formatCardClientName', () => {
		test('shows last name first, like the rest of the system', () => {
			expect(formatCardClientName({ id: 1, name: 'Juan', last_name: 'Pérez' })).toBe('Pérez Juan');
		});

		test('copes with a client that only has one of the two', () => {
			expect(formatCardClientName({ id: 1, name: 'Juan', last_name: null })).toBe('Juan');
			expect(formatCardClientName({ id: 1, name: null, last_name: 'Pérez' })).toBe('Pérez');
		});

		test('falls back when both are empty', () => {
			expect(formatCardClientName({ id: 1, name: null, last_name: null })).toBe(
				'Cliente sin nombre'
			);
		});

		test('returns null when the card has no client', () => {
			expect(formatCardClientName(null)).toBeNull();
			expect(formatCardClientName(undefined)).toBeNull();
		});
	});

	describe('formatCardWorkName', () => {
		test('prefers the name when the work has one', () => {
			expect(
				formatCardWorkName({ id: 1, name: 'Cocina Pérez', locality: 'Córdoba', address: 'Colón 1' })
			).toBe('Cocina Pérez');
		});

		test('falls back to the location, which is how works are labelled elsewhere', () => {
			expect(
				formatCardWorkName({ id: 1, name: null, locality: 'Córdoba', address: 'Colón 1234' })
			).toBe('Córdoba · Colón 1234');
		});

		test('ignores a name that is only whitespace', () => {
			expect(formatCardWorkName({ id: 1, name: '   ', locality: 'Córdoba', address: null })).toBe(
				'Córdoba'
			);
		});

		test('falls back again when there is nothing to show', () => {
			expect(formatCardWorkName({ id: 1, name: null, locality: null, address: null })).toBe(
				'Obra sin nombre'
			);
		});

		test('returns null when the card has no work', () => {
			expect(formatCardWorkName(null)).toBeNull();
		});
	});
});
