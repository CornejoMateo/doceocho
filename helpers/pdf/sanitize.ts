/**
 * jsPDF's built-in fonts only cover WinAnsi (Latin-1 plus a few cp1252 extras). Anything else
 * renders as garbage, so text is normalized before drawing. No font embedding.
 */

// cp1252 code points above Latin-1 that WinAnsi can draw.
const CP1252_EXTRAS = new Set([
	0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
	0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
	0x0153, 0x017e, 0x0178,
]);

const isZeroWidth = (cp: number) =>
	(cp >= 0x200b && cp <= 0x200f) || cp === 0x2060 || cp === 0xfeff || cp === 0x00ad;

export function sanitizePdfText(input: string): string {
	let out = '';
	for (const ch of String(input)) {
		const cp = ch.codePointAt(0) as number;
		if (cp === 0x2212) out += '-';
		else if (cp === 0x0a) out += '\n';
		else if (cp === 0x09) out += ' ';
		else if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f) || isZeroWidth(cp)) continue;
		else if (cp <= 0x7e || (cp >= 0xa0 && cp <= 0xff) || CP1252_EXTRAS.has(cp)) out += ch;
		else out += '?';
	}
	return out;
}
