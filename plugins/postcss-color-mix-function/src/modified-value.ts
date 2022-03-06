import valueParser from 'postcss-value-parser';
import type { ParsedValue, FunctionNode } from 'postcss-value-parser';
import type { Declaration, Result } from 'postcss';
import { onCSSFunction } from './on-css-function';

export function modifiedValues(originalValue: string, decl: Declaration, result: Result, preserve: boolean): string | undefined {
	let valueAST: ParsedValue | undefined;

	try {
		valueAST = valueParser(originalValue);
	} catch (error) {
		decl.warn(
			result,
			`Failed to parse value '${originalValue}' as a color-mix function. Leaving the original value intact.`,
		);
	}

	if (typeof valueAST === 'undefined') {
		return;
	}

	valueAST.walk((node) => {
		if (!node.type || node.type !== 'function') {
			return;
		}

		if (node.value !== 'color-mix') {
			return;
		}

		onCSSFunction(node as FunctionNode, decl, result, preserve);
	});
	const modifiedValue = String(valueAST);

	if (modifiedValue === originalValue) {
		return;
	}

	return modifiedValue;
}
