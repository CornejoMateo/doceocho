// Pure validators / formatters for the suppliers module.

export function onlyDigits(value: string): string {
	return value.replace(/\D/g, '');
}

/** XX-XXXXXXXX-X when there are 11 digits, otherwise returns the input untouched. */
export function formatCuit(value: string | null | undefined): string {
	if (!value) return '';
	const d = onlyDigits(value);
	if (d.length !== 11) return value;
	return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

export function getWhatsappUrl(value: string): string {
	return `https://wa.me/${onlyDigits(value)}`;
}

// Conservative: no whitespace, quotes, <>, ?, &, ',', ;, = or other URL/header-significant chars.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export function isValidEmail(value: string): boolean {
	return value.length <= 254 && EMAIL_RE.test(value);
}
