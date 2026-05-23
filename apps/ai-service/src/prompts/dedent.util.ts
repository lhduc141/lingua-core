/**
 * Strip leading indentation from template literals.
 * Cho phep indent noi dung template literal trong code ma khong them
 * whitespace thua vao string ket qua.
 *
 * Vi du:
 *   dedent`
 *     You are an AI tutor.
 *     Grade this essay.
 *   `
 *   => "You are an AI tutor.\nGrade this essay."
 */
export function dedent(strings: TemplateStringsArray, ...values: any[]): string {
	const raw = strings.reduce((result, str, i) => result + String(values[i - 1] ?? '') + str);

	const lines = raw.split('\n');

	const minIndent = lines
		.filter((line) => line.trim().length > 0)
		.reduce((min, line) => {
			const tabs = line.match(/^(\t*)/)?.[1]?.length ?? 0;
			return Math.min(min, tabs);
		}, Infinity);

	const indent = minIndent === Infinity ? 0 : minIndent;

	return lines
		.map((line) => line.slice(indent))
		.join('\n')
		.trim();
}
