import { describe, expect, it } from "vitest";
import {
	allowPlainArrowNavigation,
	isNextNavigationKey,
	isNextMainNavigationKey,
	isPlainNextNavigationKey,
	isPlainPreviousNavigationKey,
	isPreviousMainNavigationKey,
	isPreviousNavigationKey,
	mainNavigationHint,
	navigationHint,
} from "./navigation-keys";

function key(input: {
	name: string;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
}) {
	return {
		name: input.name,
		ctrl: input.ctrl ?? false,
		meta: input.meta ?? false,
		shift: input.shift ?? false,
	};
}

const ENV_KEYS = [
	"NBG_ARROW_NAV",
	"CLINE_ARROW_NAV",
	"NBG_ENABLE_ARROW_NAV",
	"CLINE_ENABLE_ARROW_NAV",
	"NBG_DISABLE_ARROW_NAV",
	"CLINE_DISABLE_ARROW_NAV",
	"NBG_MOBILE",
	"CLINE_MOBILE",
	"TERMUX_VERSION",
	"ANDROID_ROOT",
	"ANDROID_DATA",
	"PREFIX",
] as const;

function withEnv(env: Record<string, string | undefined>, run: () => void) {
	const previous = new Map<string, string | undefined>();
	for (const name of ENV_KEYS) {
		previous.set(name, process.env[name]);
		delete process.env[name];
	}
	for (const [name, value] of Object.entries(env)) {
		if (value === undefined) {
			delete process.env[name];
		} else {
			process.env[name] = value;
		}
	}

	try {
		run();
	} finally {
		for (const name of ENV_KEYS) {
			const value = previous.get(name);
			if (value === undefined) {
				delete process.env[name];
			} else {
				process.env[name] = value;
			}
		}
	}
}

describe("navigation keys", () => {
	it("keeps plain arrows enabled by default on desktop terminals", () => {
		withEnv({}, () => {
			expect(allowPlainArrowNavigation({})).toBe(true);
			expect(isPlainPreviousNavigationKey(key({ name: "up" }))).toBe(true);
			expect(isPlainNextNavigationKey(key({ name: "down" }))).toBe(true);
			expect(navigationHint()).toBe("Ctrl+P/N 或 ↑/↓ 导航");
			expect(mainNavigationHint()).toBe("Alt+P/N 或 ↑/↓ 导航");
		});
	});

	it("keeps plain arrows enabled by default on touch terminals", () => {
		expect(allowPlainArrowNavigation({ ANDROID_ROOT: "/system" })).toBe(true);
		expect(allowPlainArrowNavigation({ ANDROID_DATA: "/data" })).toBe(true);
		expect(allowPlainArrowNavigation({ TERMUX_VERSION: "0.118.0" })).toBe(
			true,
		);
		withEnv({ ANDROID_ROOT: "/system" }, () => {
			expect(isPlainPreviousNavigationKey(key({ name: "up" }))).toBe(true);
			expect(isPlainNextNavigationKey(key({ name: "down" }))).toBe(true);
			expect(navigationHint()).toBe("Ctrl+P/N 或 ↑/↓ 导航");
			expect(mainNavigationHint()).toBe("Alt+P/N 或 ↑/↓ 导航");
		});
	});

	it("allows enabling plain arrow navigation with an environment flag", () => {
		expect(allowPlainArrowNavigation({ NBG_ARROW_NAV: "1" })).toBe(true);
		expect(allowPlainArrowNavigation({ NBG_ENABLE_ARROW_NAV: "1" })).toBe(
			true,
		);
		withEnv({ NBG_ARROW_NAV: "1" }, () => {
			expect(isPlainPreviousNavigationKey(key({ name: "up" }))).toBe(true);
			expect(isPlainNextNavigationKey(key({ name: "down" }))).toBe(true);
			expect(navigationHint()).toBe("Ctrl+P/N 或 ↑/↓ 导航");
			expect(mainNavigationHint()).toBe("Alt+P/N 或 ↑/↓ 导航");
		});
	});

	it("uses Ctrl+P/N for navigation", () => {
		expect(isPreviousNavigationKey(key({ name: "p", ctrl: true }))).toBe(true);
		expect(isNextNavigationKey(key({ name: "n", ctrl: true }))).toBe(true);
		expect(isPreviousNavigationKey(key({ name: "p", ctrl: true, meta: true }))).toBe(
			false,
		);
	});

	it("uses Alt+P/N for main view navigation without stealing Ctrl+P", () => {
		withEnv({}, () => {
			expect(isPreviousMainNavigationKey(key({ name: "p", meta: true }))).toBe(
				true,
			);
			expect(isNextMainNavigationKey(key({ name: "n", meta: true }))).toBe(
				true,
			);
			expect(isPreviousMainNavigationKey(key({ name: "p", ctrl: true }))).toBe(
				false,
			);
			expect(mainNavigationHint()).toBe("Alt+P/N 或 ↑/↓ 导航");
		});
	});

	it("allows disabling plain arrow navigation with an environment flag", () => {
		expect(allowPlainArrowNavigation({ NBG_DISABLE_ARROW_NAV: "1" })).toBe(
			false,
		);
		expect(allowPlainArrowNavigation({ NBG_ARROW_NAV: "0" })).toBe(false);
		withEnv({ NBG_DISABLE_ARROW_NAV: "1" }, () => {
			expect(navigationHint()).toBe("Ctrl+P/N 导航");
			expect(mainNavigationHint()).toBe("Alt+P/N 导航");
		});
	});
});
