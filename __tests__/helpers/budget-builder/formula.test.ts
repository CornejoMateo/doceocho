import { evaluateFormula, tryEvaluateFormula } from '@/helpers/budget-builder/formula';

describe('helpers/budget-builder/formula', () => {
	test('plain numbers, with dot or comma decimals', () => {
		expect(evaluateFormula('3')).toBe(3);
		expect(evaluateFormula('0,5')).toBe(0.5);
		expect(evaluateFormula('0.25')).toBe(0.25);
	});

	test('respects operator precedence and parentheses', () => {
		expect(evaluateFormula('2 + 3 * 4')).toBe(14);
		expect(evaluateFormula('(2 + 3) * 4')).toBe(20);
		expect(evaluateFormula('-2 + 5')).toBe(3);
	});

	test('uses the furniture variables, ignoring case', () => {
		expect(evaluateFormula('Patas * 4', { patas: 3 })).toBe(12);
		expect(evaluateFormula('superficie * 1.1', { superficie: 2 })).toBeCloseTo(2.2);
	});

	test('functions take ";" between arguments since "," is a decimal', () => {
		expect(evaluateFormula('arriba(2.1)')).toBe(3);
		expect(evaluateFormula('abajo(2.9)')).toBe(2);
		expect(evaluateFormula('max(1; 4; 2)')).toBe(4);
		expect(evaluateFormula('redondear(patas * 1.4)', { patas: 3 })).toBe(4);
	});

	test('an empty quantity counts as zero', () => {
		expect(evaluateFormula('  ')).toBe(0);
	});

	test('never runs code, only arithmetic', () => {
		expect(() => evaluateFormula('alert(1)')).toThrow('Función desconocida');
		expect(() => evaluateFormula('process.exit()')).toThrow();
	});

	test('reports what is wrong in Spanish instead of throwing', () => {
		expect(tryEvaluateFormula('patas *', { patas: 4 })).toEqual({
			value: 0,
			error: 'La fórmula está incompleta',
		});
		expect(tryEvaluateFormula('largo * 2', {}).error).toBe('Variable desconocida: "largo"');
		expect(tryEvaluateFormula('4 / 0', {}).error).toBe('División por cero');
		expect(tryEvaluateFormula('(2 + 3', {}).error).toBe('Se esperaba ")"');
	});
});
