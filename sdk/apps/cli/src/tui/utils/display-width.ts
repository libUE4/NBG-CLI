const ANSI_ESCAPE_PATTERN =
	/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

function isCombiningCodePoint(code: number): boolean {
	return (
		(code >= 0x0300 && code <= 0x036f) ||
		(code >= 0x1ab0 && code <= 0x1aff) ||
		(code >= 0x1dc0 && code <= 0x1dff) ||
		(code >= 0x20d0 && code <= 0x20ff) ||
		(code >= 0xfe20 && code <= 0xfe2f)
	);
}

function isWideCodePoint(code: number): boolean {
	return (
		code >= 0x1100 &&
		(code <= 0x115f ||
			code === 0x2329 ||
			code === 0x232a ||
			(code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
			(code >= 0xac00 && code <= 0xd7a3) ||
			(code >= 0xf900 && code <= 0xfaff) ||
			(code >= 0xfe10 && code <= 0xfe19) ||
			(code >= 0xfe30 && code <= 0xfe6f) ||
			(code >= 0xff00 && code <= 0xff60) ||
			(code >= 0xffe0 && code <= 0xffe6) ||
			(code >= 0x1f300 && code <= 0x1f64f) ||
			(code >= 0x1f900 && code <= 0x1f9ff) ||
			(code >= 0x20000 && code <= 0x3fffd))
	);
}

function codePointWidth(char: string): number {
	const code = char.codePointAt(0);
	if (code === undefined) return 0;
	if (code === 0 || code < 32 || (code >= 0x7f && code < 0xa0)) return 0;
	if (isCombiningCodePoint(code)) return 0;
	return isWideCodePoint(code) ? 2 : 1;
}

export function stripAnsi(value: string): string {
	return value.replace(ANSI_ESCAPE_PATTERN, "");
}

export function displayWidth(value: string): number {
	let width = 0;
	for (const char of stripAnsi(value)) {
		width += codePointWidth(char);
	}
	return width;
}

export function truncateEndByWidth(value: string, maxWidth: number): string {
	if (maxWidth <= 0) return "";
	if (displayWidth(value) <= maxWidth) return value;
	if (maxWidth === 1) return "\u2026";

	const ellipsis = "\u2026";
	const limit = maxWidth - displayWidth(ellipsis);
	let width = 0;
	let output = "";

	for (const char of stripAnsi(value)) {
		const nextWidth = codePointWidth(char);
		if (width + nextWidth > limit) break;
		output += char;
		width += nextWidth;
	}

	return `${output}${ellipsis}`;
}

export function truncateStartByWidth(value: string, maxWidth: number): string {
	if (maxWidth <= 0) return "";
	if (displayWidth(value) <= maxWidth) return value;
	if (maxWidth === 1) return "\u2026";

	const ellipsis = "\u2026";
	const limit = maxWidth - displayWidth(ellipsis);
	let width = 0;
	let output = "";
	const chars = [...stripAnsi(value)];

	for (let index = chars.length - 1; index >= 0; index--) {
		const char = chars[index];
		if (!char) continue;
		const nextWidth = codePointWidth(char);
		if (width + nextWidth > limit) break;
		output = `${char}${output}`;
		width += nextWidth;
	}

	return `${ellipsis}${output}`;
}
