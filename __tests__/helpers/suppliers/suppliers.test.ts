import { isDuplicateTaxIdError } from '@/helpers/suppliers/suppliers';

describe('isDuplicateTaxIdError', () => {
	const INDEX = 'suppliers_tax_id_unique_idx';

	it('matches the index name in message, details or constraint', () => {
		expect(
			isDuplicateTaxIdError({
				code: '23505',
				message: `duplicate key value violates unique constraint "${INDEX}"`,
			})
		).toBe(true);
		expect(isDuplicateTaxIdError({ details: `Key (tax_id)=(1) already exists. ${INDEX}` })).toBe(
			true
		);
		expect(isDuplicateTaxIdError({ constraint: INDEX })).toBe(true);
	});

	it('does not match other unique violations', () => {
		expect(
			isDuplicateTaxIdError({
				code: '23505',
				message: 'duplicate key value violates unique constraint "suppliers_pkey"',
			})
		).toBe(false);
	});

	it('is safe with null, undefined and non-object errors', () => {
		expect(isDuplicateTaxIdError(null)).toBe(false);
		expect(isDuplicateTaxIdError(undefined)).toBe(false);
		expect(isDuplicateTaxIdError('boom')).toBe(false);
		expect(isDuplicateTaxIdError({})).toBe(false);
	});
});
