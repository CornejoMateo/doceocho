// This method is used to format the numerical values retrieved
// from the database so that they are displayed in the Argentine format.
export const formatCurrency = (amount: number | null | undefined) => {
	if (!amount) return '$0';
	return new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'ARS',
		minimumFractionDigits: 0,
		maximumFractionDigits: 3,
	}).format(amount);
};

// This method is similar to formatCurrency but we'll use it when we need to
// retrieve a number from the database and enter it into an input field
export const formatCurrencyWithoutSymbol = (amount: number | null | undefined) => {
	if (!amount) return '0.00';
	return new Intl.NumberFormat('es-AR', {
		style: 'decimal',
		minimumFractionDigits: 0,
		maximumFractionDigits: 3,
	}).format(amount);
};

// Similar to formatCurrency but for USD
export const formatCurrencyUSD = (amount: number | null | undefined) => {
	if (!amount) return 'US$ 0';
	return new Intl.NumberFormat('es-AR', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 3,
	}).format(amount);
};

// Normalizes a number to have at most 3 decimal places, and avoids -0
export const normalizeMoney = (value: number): number => {
	const rounded = Math.round((value + Number.EPSILON) * 1000) / 1000;
	return Object.is(rounded, -0) ? 0 : rounded;
};

// This allows the input value to be formatted as the user types,
// but we need to set the input type to “text”
export const formatNumber = (value: string) => {
	// remove all except digits and comma
	let cleaned = value.replace(/[^\d,]/g, '');

	// separate integer and decimal parts
	const parts = cleaned.split(',');
	const integerPart = parts[0];
	const decimalPart = parts[1];

	// format integer part with thousand separators
	const formattedInteger = integerPart
		? new Intl.NumberFormat('es-AR').format(Number(integerPart))
		: '';

	// reconstruct the number with comma if there was a decimal part or if the user typed a comma
	if (cleaned.includes(',')) {
		return decimalPart !== undefined
			? `${formattedInteger},${decimalPart}`
			: `${formattedInteger},`;
	}

	return formattedInteger;
};

//This is commonly used in conjunction with `formatNumber` to store the value
// in the database using the appropriate syntax
export const parseArsToNumber = (value: string): number => {
	if (!value) return 0;

	const normalized = value.replace(/\./g, '').replace(',', '.');

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : 0;
};
