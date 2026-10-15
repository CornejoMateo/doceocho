export const IVA_RATES = [0, 10.5, 21, 27] as const;

function round2(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeIvaAndTotal(netAmount: number, ivaPercent: number) {
	const ivaAmount = round2((netAmount * ivaPercent) / 100);
	const totalAmount = round2(netAmount + ivaAmount);
	return { ivaAmount, totalAmount };
}
