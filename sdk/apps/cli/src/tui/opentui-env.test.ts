import { describe, expect, it } from "vitest";
import {
	resolveOpenTuiInputMode,
	shouldUseNativeTerminalScrollback,
	shouldUseMobileSoftKeyboardMode,
} from "./opentui-env";

describe("OpenTUI input mode", () => {
	it("keeps desktop mouse reporting off by default so scroll does not select", () => {
		expect(shouldUseMobileSoftKeyboardMode({})).toBe(false);
		expect(resolveOpenTuiInputMode({})).toEqual({
			autoFocus: false,
			enableMouseMovement: false,
			screenMode: "alternate-screen",
			useMouse: false,
		});
	});

	it("allows mouse support to be forced on", () => {
		expect(resolveOpenTuiInputMode({ NBG_MOUSE: "1" })).toEqual({
			autoFocus: false,
			enableMouseMovement: true,
			screenMode: "alternate-screen",
			useMouse: true,
		});
	});

	it("uses soft-keyboard mode for Termux and Android terminals", () => {
		expect(shouldUseMobileSoftKeyboardMode({ TERMUX_VERSION: "0.118.0" })).toBe(
			true,
		);
		expect(resolveOpenTuiInputMode({ ANDROID_ROOT: "/system" })).toEqual({
			autoFocus: true,
			enableMouseMovement: false,
			screenMode: "main-screen",
			useMouse: false,
		});
	});

	it("allows the mobile mode to be forced or disabled", () => {
		expect(resolveOpenTuiInputMode({ NBG_MOBILE: "1" })).toEqual({
			autoFocus: true,
			enableMouseMovement: false,
			screenMode: "main-screen",
			useMouse: false,
		});
		expect(
			resolveOpenTuiInputMode({
				ANDROID_ROOT: "/system",
				NBG_MOBILE: "0",
			}),
		).toEqual({
			autoFocus: false,
			enableMouseMovement: false,
			screenMode: "alternate-screen",
			useMouse: false,
		});
	});

	it("uses native terminal scrollback only for mobile no-mouse mode", () => {
		expect(shouldUseNativeTerminalScrollback({ ANDROID_ROOT: "/system" })).toBe(
			true,
		);
		expect(
			shouldUseNativeTerminalScrollback({
				ANDROID_ROOT: "/system",
				NBG_MOUSE: "1",
			}),
		).toBe(false);
		expect(shouldUseNativeTerminalScrollback({})).toBe(false);
	});
});
