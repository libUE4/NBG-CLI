/**
 * OpenTUI probes Kitty graphics support during startup. In some terminals that
 * probe response can leak into the visible CLI as text like:
 * Gi=31337, s=1, v=1, a=q, t=d, f=24; AAAA
 *
 * The report looked related to mouse handling because it appeared while the
 * home screen robot was tracking cursor movement. NBG keeps mouse reporting
 * off by default. On Android/Termux it also uses the main screen, matching
 * Claude/Kimi-style prompt UIs: tapping the terminal can open the soft
 * keyboard, and swiping scrolls terminal scrollback instead of being parsed
 * as application ↑/↓ or wheel events.
 *
 * Set NBG_MOUSE=1 to force alternate-screen mouse movement/click/hover
 * tracking when you explicitly want the TUI to capture touch/mouse events.
 *
 * Implications: keyboard input, mouse clicks, mouse movement, colors, Unicode
 * text rendering, ASCII art, and the regular OpenTUI renderer all stay enabled.
 * OpenTUI renderers created after this point will not detect or use Kitty
 * inline bitmap graphics, and child processes may inherit this env var if they
 * are spawned with the default environment. The CLI currently renders text and
 * ASCII frames, including the robot animation, so Kitty bitmap graphics are not
 * used here.
 */
export function disableOpenTuiGraphicsProbe(): void {
	process.env.OPENTUI_GRAPHICS = "0";
}

function isTruthyEnv(value: string | undefined): boolean {
	return value === "1" || value === "true" || value === "yes" || value === "on";
}

function isFalsyEnv(value: string | undefined): boolean {
	return value === "0" || value === "false" || value === "no" || value === "off";
}

export function shouldUseMobileSoftKeyboardMode(env = process.env): boolean {
	if (isTruthyEnv(env.NBG_MOBILE) || isTruthyEnv(env.CLINE_MOBILE)) {
		return true;
	}
	if (isFalsyEnv(env.NBG_MOBILE) || isFalsyEnv(env.CLINE_MOBILE)) {
		return false;
	}

	return !!(
		env.TERMUX_VERSION ||
		env.ANDROID_ROOT ||
		env.ANDROID_DATA ||
		env.PREFIX?.includes("com.termux")
	);
}

export function resolveOpenTuiInputMode(env = process.env): {
	autoFocus: boolean;
	enableMouseMovement: boolean;
	screenMode: "alternate-screen" | "main-screen";
	useMouse: boolean;
} {
	if (isTruthyEnv(env.NBG_MOUSE) || isTruthyEnv(env.CLINE_MOUSE)) {
		return {
			autoFocus: false,
			enableMouseMovement: true,
			screenMode: "alternate-screen",
			useMouse: true,
		};
	}

	if (shouldUseMobileSoftKeyboardMode(env)) {
		return {
			autoFocus: true,
			enableMouseMovement: false,
			screenMode: "main-screen",
			useMouse: false,
		};
	}

	return {
		autoFocus: false,
		enableMouseMovement: false,
		screenMode: "alternate-screen",
		useMouse: false,
	};
}

export function shouldUseNativeTerminalScrollback(env = process.env): boolean {
	const inputMode = resolveOpenTuiInputMode(env);
	return inputMode.screenMode === "main-screen" && !inputMode.useMouse;
}
