/**
 * Tiny, safe evaluator for quantity formulas: numbers, variables, + - * / and parentheses,
 * plus a few functions. No `eval`, so a formula can never run code.
 */

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
	redondear: (value) => Math.round(value),
	arriba: (value) => Math.ceil(value),
	abajo: (value) => Math.floor(value),
	max: (...values) => Math.max(...values),
	min: (...values) => Math.min(...values),
};

export const FORMULA_FUNCTIONS = Object.keys(FUNCTIONS);

type Token = { type: 'number' | 'name' | 'op'; value: string };

function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;

	while (index < source.length) {
		const char = source[index];

		if (/\s/.test(char)) {
			index++;
		} else if (/[0-9.,]/.test(char)) {
			let number = '';
			while (index < source.length && /[0-9.,]/.test(source[index])) number += source[index++];
			// Sellers type "0,5" as often as "0.5".
			tokens.push({ type: 'number', value: number.replace(',', '.') });
		} else if (/[a-zA-ZáéíóúñÁÉÍÓÚÑ_]/.test(char)) {
			let name = '';
			while (index < source.length && /[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ_]/.test(source[index])) {
				name += source[index++];
			}
			tokens.push({ type: 'name', value: name.toLowerCase() });
		} else if ('+-*/()'.includes(char) || char === ';') {
			tokens.push({ type: 'op', value: char });
			index++;
		} else {
			throw new Error(`Carácter no válido: "${char}"`);
		}
	}

	return tokens;
}

export function evaluateFormula(source: string, variables: Record<string, number> = {}): number {
	const tokens = tokenize(source.trim());
	let position = 0;

	const peek = () => tokens[position];
	const next = () => tokens[position++];
	const expect = (value: string) => {
		const token = next();
		if (token?.value !== value) throw new Error(`Se esperaba "${value}"`);
	};

	// expression := term (('+' | '-') term)*
	function expression(): number {
		let value = term();
		while (peek()?.value === '+' || peek()?.value === '-') {
			value = next().value === '+' ? value + term() : value - term();
		}
		return value;
	}

	// term := factor (('*' | '/') factor)*
	function term(): number {
		let value = factor();
		while (peek()?.value === '*' || peek()?.value === '/') {
			if (next().value === '*') {
				value *= factor();
			} else {
				const divisor = factor();
				if (divisor === 0) throw new Error('División por cero');
				value /= divisor;
			}
		}
		return value;
	}

	// factor := number | name | name '(' args ')' | '(' expression ')' | '-' factor
	function factor(): number {
		const token = next();

		if (!token) throw new Error('La fórmula está incompleta');

		if (token.type === 'number') {
			const value = Number(token.value);
			if (Number.isNaN(value)) throw new Error(`Número no válido: "${token.value}"`);
			return value;
		}

		if (token.value === '-') return -factor();

		if (token.value === '(') {
			const value = expression();
			expect(')');
			return value;
		}

		if (token.type === 'name') {
			if (peek()?.value === '(') {
				const fn = FUNCTIONS[token.value];
				if (!fn) throw new Error(`Función desconocida: "${token.value}"`);
				next();
				const args = [expression()];
				while (peek()?.value === ';') {
					next();
					args.push(expression());
				}
				expect(')');
				return fn(...args);
			}

			if (!(token.value in variables)) throw new Error(`Variable desconocida: "${token.value}"`);
			return variables[token.value];
		}

		throw new Error(`Símbolo inesperado: "${token.value}"`);
	}

	if (tokens.length === 0) return 0;

	const result = expression();

	if (position < tokens.length) throw new Error(`Símbolo inesperado: "${peek().value}"`);

	return result;
}

/** Same as evaluateFormula but never throws: the editor shows the message next to the field. */
export function tryEvaluateFormula(
	source: string,
	variables: Record<string, number>
): { value: number; error: string | null } {
	try {
		return { value: evaluateFormula(source, variables), error: null };
	} catch (error) {
		return { value: 0, error: error instanceof Error ? error.message : 'Fórmula no válida' };
	}
}
