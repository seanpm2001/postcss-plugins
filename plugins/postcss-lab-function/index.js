import { lab2rgb, lch2rgb } from '@csstools/convert-colors';
import postcss from 'postcss';
import parser from 'postcss-values-parser';

export default postcss.plugin('postcss-lab-function', opts => {
	const preserve = 'preserve' in Object(opts) ? Boolean(opts.preserve) : false;

	return root => {
		root.walkDecls(decl => {
			const { value } = decl;

			if (colorAnyRegExp.test(value)) {
				const ast = parser(value).parse();

				ast.walkType('func', node => {
					if (colorRegExp.test(node.value)) {
						const children = node.nodes.slice(1, -1);
						const isLab = labRegExp.test(node.value);
						const isFunctionalLAB = matchFunctionalLAB(children);
						const isFunctionalLCH = matchFunctionalLCH(children);

						if (isFunctionalLAB || isFunctionalLCH) {
							node.value = 'rgb'

							const slashNode = children[3];
							const alphaNode = children[4];

							if (alphaNode) {
								if (isPercentage(alphaNode) && !isCalc(alphaNode)) {
									alphaNode.unit = '';
									alphaNode.value = String(alphaNode.value / 100);
								}

								if (alphaNode.value === '1') {
									slashNode.remove();
									alphaNode.remove();
								} else {
									node.value += 'a';
								}
							}

							if (isSlash(slashNode)) {
								slashNode.replaceWith( newComma() );
							}

							const converter = isLab ? lab2rgb : lch2rgb;

							const rgbValues = converter(
								...[
									children[0].value,
									children[1].value,
									children[2].value
								].map(
									number => parseFloat(number)
								)
							).map(
								sourceValue => parseInt(sourceValue * 2.55)
							)

							children[0].value = String(rgbValues[0]);
							children[1].value = String(rgbValues[1]);
							children[2].value = String(rgbValues[2]);

							node.nodes.splice(3, 0, [ newComma() ]);
							node.nodes.splice(2, 0, [ newComma() ]);
						}
					}
				});

				const newValue = String(ast);

				if (preserve) {
					decl.cloneBefore({ value: newValue });
				} else {
					decl.value = newValue;
				}
			}
		});
	};
});

const colorAnyRegExp = /(^|[^\w-])(lab?|lch?)\(/i;
const colorRegExp = /^(lab?|lch?)$/i;
const labRegExp = /^lab$/i;
const alphaUnitMatch = /^%?$/i;
const calcFuncMatch = /^calc$/i;
const hueUnitMatch = /^(deg|grad|rad|turn)?$/i;

const isAlphaValue = node => isCalc(node) || Object(node).type === 'number' && alphaUnitMatch.test(node.unit);
const isCalc = node => Object(node).type === 'func' && calcFuncMatch.test(node.value);
const isHue = node => isCalc(node) || Object(node).type === 'number' && hueUnitMatch.test(node.unit);
const isNumber = node => isCalc(node) || Object(node).type === 'number' && node.unit === '';
const isPercentage = node => isCalc(node) || Object(node).type === 'number' && node.unit === '%';
const isSlash = node => Object(node).type === 'operator' && node.value === '/';
const functionalLABMatch = [isNumber, isNumber, isNumber, isSlash, isAlphaValue];
const functionalLCHMatch = [isNumber, isNumber, isHue, isSlash, isAlphaValue];
const matchFunctionalLAB = children => children.every(
	(child, index) => typeof functionalLABMatch[index] === 'function' && functionalLABMatch[index](child)
);
const matchFunctionalLCH = children => children.every(
	(child, index) => typeof functionalLCHMatch[index] === 'function' && functionalLCHMatch[index](child)
);

const newComma = () => parser.comma({ value: ',' })