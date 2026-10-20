import { diffById } from '@/helpers/budget-builder/sync';
import {
	isBudgetToken,
	MAX_CLIENT_COMMENT_LENGTH,
	parseClientResponse,
} from '@/helpers/budget-builder/client-response';

describe('helpers/budget-builder/sync', () => {
	const a = { id: 'a', price: 1 };
	const b = { id: 'b', price: 2 };

	test('nothing to save when nothing changed', () => {
		expect(diffById([a, b], [a, b])).toEqual({ upserts: [], deletes: [] });
	});

	test('only the edited row is saved', () => {
		const edited = { ...b, price: 3 };

		expect(diffById([a, b], [a, edited])).toEqual({
			upserts: [{ item: edited, position: 1 }],
			deletes: [],
		});
	});

	test('new rows are saved and removed ones deleted', () => {
		const c = { id: 'c', price: 5 };

		expect(diffById([a, b], [a, c])).toEqual({
			upserts: [{ item: c, position: 1 }],
			deletes: ['b'],
		});
	});

	test('moving a row saves its new position', () => {
		expect(diffById([a, b], [b, a]).upserts).toEqual([
			{ item: b, position: 0 },
			{ item: a, position: 1 },
		]);
	});
});

describe('helpers/budget-builder/client-response', () => {
	test('accepts an approval, with or without comment', () => {
		expect(parseClientResponse({ decision: 'aprobado' })).toEqual({
			decision: 'aprobado',
			comment: null,
		});
		expect(parseClientResponse({ decision: 'rechazado', comment: '  muy caro  ' })).toEqual({
			decision: 'rechazado',
			comment: 'muy caro',
		});
	});

	test('rejects anything that is not one of the two answers', () => {
		expect(parseClientResponse({ decision: 'enviado' })).toEqual({ error: 'Respuesta inválida' });
		expect(parseClientResponse(null)).toEqual({ error: 'Respuesta inválida' });
	});

	test('rejects a comment that is too long', () => {
		const comment = 'x'.repeat(MAX_CLIENT_COMMENT_LENGTH + 1);

		expect(parseClientResponse({ decision: 'rechazado', comment })).toEqual({
			error: 'El comentario es demasiado largo',
		});
	});

	test('only uuid tokens open a budget', () => {
		expect(isBudgetToken('6f1c2a7e-3b9d-4c8e-9a0b-1d2e3f4a5b6c')).toBe(true);
		expect(isBudgetToken('1 or 1=1')).toBe(false);
	});
});
