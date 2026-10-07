import fs from "fs";
import path from "path";
import ts from "typescript";

const SRC_DIR = path.resolve(process.cwd(), "src");

// Allowed semantic tokens for approved authentication and payment forms
const ALLOWED_SEMANTIC_AUTOCOMPLETE = new Set([
	"off",
	"username",
	"current-password",
	"new-password",
	"one-time-code",
	"name",
	"organization",
	"cc-name",
	"cc-number",
	"cc-exp",
	"cc-csc",
]);

const NON_TEXT_INPUT_TYPES = new Set([
	"checkbox",
	"radio",
	"file",
	"color",
	"range",
	"button",
	"submit",
	"reset",
	"hidden",
	"image",
]);

interface AuditViolation {
	file: string;
	line: number;
	tag: string;
	reason: string;
	snippet: string;
}

interface AuditStats {
	filesScanned: number;
	totalInputs: number;
	textInputs: number;
	nonTextInputs: number;
	textareas: number;
	datalistCount: number;
	listAttributeCount: number;
	autoCompleteOffCount: number;
	semanticAutocompleteCount: number;
	violations: AuditViolation[];
}

const stats: AuditStats = {
	filesScanned: 0,
	totalInputs: 0,
	textInputs: 0,
	nonTextInputs: 0,
	textareas: 0,
	datalistCount: 0,
	listAttributeCount: 0,
	autoCompleteOffCount: 0,
	semanticAutocompleteCount: 0,
	violations: [],
};

function getAllSourceFiles(dir: string): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	let files: string[] = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files = files.concat(getAllSourceFiles(fullPath));
		} else if (/\.(tsx|jsx)$/.test(entry.name)) {
			files.push(fullPath);
		}
	}
	return files;
}

function resolveExpressionValues(expr: ts.Expression): string[] {
	if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
		return [expr.text];
	}
	if (ts.isConditionalExpression(expr)) {
		return [
			...resolveExpressionValues(expr.whenTrue),
			...resolveExpressionValues(expr.whenFalse),
		];
	}
	if (ts.isIdentifier(expr)) {
		// e.g. prop forwarding autoComplete={autoComplete}
		if (expr.text === "autoComplete") {
			return ["__prop_forward_autoComplete__"];
		}
	}
	return [expr.getText()];
}

function getAttributePossibleValues(
	attributes: ts.JsxAttributes,
	attrName: string
): string[] | undefined {
	for (const prop of attributes.properties) {
		if (ts.isJsxAttribute(prop) && prop.name.getText() === attrName) {
			if (!prop.initializer) {
				return ["true"];
			}
			if (ts.isStringLiteral(prop.initializer)) {
				return [prop.initializer.text];
			}
			if (ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
				return resolveExpressionValues(prop.initializer.expression);
			}
		}
	}
	return undefined;
}

function hasAttribute(attributes: ts.JsxAttributes, attrName: string): boolean {
	return attributes.properties.some(
		(prop) => ts.isJsxAttribute(prop) && prop.name.getText() === attrName
	);
}

function inspectFile(filePath: string) {
	stats.filesScanned++;
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const sourceFile = ts.createSourceFile(
		filePath,
		fileContent,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX
	);

	function visit(node: ts.Node) {
		if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
			const tagName = node.tagName.getText();
			const attributes = node.attributes;
			const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
			const lineNumber = line + 1;
			const snippet = node.getText().slice(0, 140).replace(/\s+/g, " ");

			// Check for datalist
			if (tagName.toLowerCase() === "datalist") {
				stats.datalistCount++;
				stats.violations.push({
					file: path.relative(process.cwd(), filePath),
					line: lineNumber,
					tag: tagName,
					reason: "<datalist> element found. Datalists provide browser autocomplete dropdowns and are forbidden.",
					snippet,
				});
			}

			// Check for list attribute
			if (hasAttribute(attributes, "list")) {
				stats.listAttributeCount++;
				stats.violations.push({
					file: path.relative(process.cwd(), filePath),
					line: lineNumber,
					tag: tagName,
					reason: "Element has 'list' attribute referencing a datalist, which causes suggestion dropdowns.",
					snippet,
				});
			}

			// Check input elements
			if (tagName === "input") {
				stats.totalInputs++;
				const typeVals = getAttributePossibleValues(attributes, "type") || ["text"];
				const primaryType = typeVals[0]?.toLowerCase().replace(/['"]/g, "");
				const isNonText = primaryType && NON_TEXT_INPUT_TYPES.has(primaryType);

				if (isNonText) {
					stats.nonTextInputs++;
				} else {
					stats.textInputs++;
					const possibleAutoComplete = getAttributePossibleValues(attributes, "autoComplete");

					if (!possibleAutoComplete || possibleAutoComplete.length === 0) {
						stats.violations.push({
							file: path.relative(process.cwd(), filePath),
							line: lineNumber,
							tag: "input",
							reason: `Text-bearing input (type=${primaryType || "text (default)"}) is missing explicit autoComplete attribute.`,
							snippet,
						});
					} else {
						let allValid = true;
						for (const val of possibleAutoComplete) {
							const cleanVal = val.replace(/['"]/g, "");
							if (cleanVal === "__prop_forward_autoComplete__") {
								// Reusable input component forwarding the autoComplete prop
								stats.semanticAutocompleteCount++;
							} else if (cleanVal === "off") {
								stats.autoCompleteOffCount++;
							} else if (ALLOWED_SEMANTIC_AUTOCOMPLETE.has(cleanVal)) {
								stats.semanticAutocompleteCount++;
							} else {
								allValid = false;
								stats.violations.push({
									file: path.relative(process.cwd(), filePath),
									line: lineNumber,
									tag: "input",
									reason: `Invalid or unapproved autoComplete value "${cleanVal}". Must be "off" or an allowed semantic token.`,
									snippet,
								});
							}
						}
					}
				}
			}

			// Check textarea elements
			if (tagName === "textarea") {
				stats.textareas++;
				const possibleAutoComplete = getAttributePossibleValues(attributes, "autoComplete");

				if (!possibleAutoComplete || possibleAutoComplete.length === 0) {
					stats.violations.push({
						file: path.relative(process.cwd(), filePath),
						line: lineNumber,
						tag: "textarea",
						reason: "Textarea is missing explicit autoComplete attribute.",
						snippet,
					});
				} else {
					for (const val of possibleAutoComplete) {
						const cleanVal = val.replace(/['"]/g, "");
						if (cleanVal === "__prop_forward_autoComplete__") {
							stats.semanticAutocompleteCount++;
						} else if (cleanVal === "off") {
							stats.autoCompleteOffCount++;
						} else if (ALLOWED_SEMANTIC_AUTOCOMPLETE.has(cleanVal)) {
							stats.semanticAutocompleteCount++;
						} else {
							stats.violations.push({
								file: path.relative(process.cwd(), filePath),
								line: lineNumber,
								tag: "textarea",
								reason: `Invalid or unapproved autoComplete value "${cleanVal}" on textarea.`,
								snippet,
							});
						}
					}
				}
			}
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
}

// Check for localStorage search history caching across src
function checkLocalStorageHistory() {
	const allTsFiles = getAllSourceFiles(SRC_DIR);
	const historyPattern = /localStorage\.(setItem|getItem)\s*\(\s*['"`](.*(search|history|query|suggest).*)['"`]/i;

	for (const file of allTsFiles) {
		const content = fs.readFileSync(file, "utf-8");
		const lines = content.split("\n");
		lines.forEach((line, idx) => {
			if (historyPattern.test(line)) {
				stats.violations.push({
					file: path.relative(process.cwd(), file),
					line: idx + 1,
					tag: "localStorage",
					reason: "Potential localStorage search/query history caching detected.",
					snippet: line.trim(),
				});
			}
		});
	}
}

function runAudit() {
	console.log("=================================================");
	console.log(" BEASTCODE INPUT & AUTOCOMPLETE AUDIT (LAYER 8)  ");
	console.log("=================================================\n");

	const files = getAllSourceFiles(SRC_DIR);
	console.log(`Found ${files.length} JSX/TSX source files under src/\n`);

	for (const file of files) {
		inspectFile(file);
	}

	checkLocalStorageHistory();

	console.log("AUDIT SUMMARY:");
	console.log("-------------------------------------------------");
	console.log(`Files Scanned:                      ${stats.filesScanned}`);
	console.log(`Total <input> elements:             ${stats.totalInputs}`);
	console.log(`  - Text-bearing inputs:            ${stats.textInputs}`);
	console.log(`  - Non-text inputs (checkbox, etc): ${stats.nonTextInputs}`);
	console.log(`Total <textarea> elements:          ${stats.textareas}`);
	console.log(`Inputs/Textareas with 'off':        ${stats.autoCompleteOffCount}`);
	console.log(`Allowed Semantic Autocomplete:      ${stats.semanticAutocompleteCount}`);
	console.log(`<datalist> elements found:          ${stats.datalistCount}`);
	console.log(`'list' attributes found:            ${stats.listAttributeCount}`);
	console.log(`Total Violations:                   ${stats.violations.length}`);
	console.log("-------------------------------------------------\n");

	if (stats.violations.length > 0) {
		console.error(`FAILED: Found ${stats.violations.length} violation(s):\n`);
		stats.violations.forEach((v, index) => {
			console.error(`[${index + 1}] ${v.file}:${v.line} (${v.tag})`);
			console.error(`    Reason:  ${v.reason}`);
			console.error(`    Snippet: ${v.snippet}\n`);
		});
		process.exit(1);
	} else {
		console.log("PASSED: 100% of input and textarea elements conform to the autocomplete policy!");
		console.log("Zero datalists, zero list attributes, zero unapproved autocomplete tokens.\n");
		process.exit(0);
	}
}

runAudit();
