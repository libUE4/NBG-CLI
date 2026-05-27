type NavigationKey = {
	name?: string;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
};

function isTruthyEnv(value: string | undefined): boolean {
	return value === "1" || value === "true" || value === "yes" || value === "on";
}

function isFalsyEnv(value: string | undefined): boolean {
	return value === "0" || value === "false" || value === "no" || value === "off";
}

export function allowPlainArrowNavigation(env = process.env): boolean {
	if (
		isTruthyEnv(env.NBG_ARROW_NAV) ||
		isTruthyEnv(env.CLINE_ARROW_NAV) ||
		isTruthyEnv(env.NBG_ENABLE_ARROW_NAV) ||
		isTruthyEnv(env.CLINE_ENABLE_ARROW_NAV)
	) {
		return true;
	}
	if (
		isTruthyEnv(env.NBG_DISABLE_ARROW_NAV) ||
		isTruthyEnv(env.CLINE_DISABLE_ARROW_NAV)
	) {
		return false;
	}
	if (isFalsyEnv(env.NBG_ARROW_NAV) || isFalsyEnv(env.CLINE_ARROW_NAV)) {
		return false;
	}
	return true;
}

export function isPlainPreviousNavigationKey(key: NavigationKey): boolean {
	return (
		allowPlainArrowNavigation() &&
		key.name === "up" &&
		!key.ctrl &&
		!key.meta &&
		!key.shift
	);
}

export function isPlainNextNavigationKey(key: NavigationKey): boolean {
	return (
		allowPlainArrowNavigation() &&
		key.name === "down" &&
		!key.ctrl &&
		!key.meta &&
		!key.shift
	);
}

export function isPreviousNavigationKey(key: NavigationKey): boolean {
	return (
		isPlainPreviousNavigationKey(key) ||
		(key.name === "p" && key.ctrl === true && !key.meta && !key.shift)
	);
}

export function isNextNavigationKey(key: NavigationKey): boolean {
	return (
		isPlainNextNavigationKey(key) ||
		(key.name === "n" && key.ctrl === true && !key.meta && !key.shift)
	);
}

export function isPreviousMainNavigationKey(key: NavigationKey): boolean {
	return (
		isPlainPreviousNavigationKey(key) ||
		(key.name === "p" && key.meta === true && !key.ctrl && !key.shift)
	);
}

export function isNextMainNavigationKey(key: NavigationKey): boolean {
	return (
		isPlainNextNavigationKey(key) ||
		(key.name === "n" && key.meta === true && !key.ctrl && !key.shift)
	);
}

export function navigationHint(action = "导航"): string {
	return allowPlainArrowNavigation()
		? `Ctrl+P/N 或 ↑/↓ ${action}`
		: `Ctrl+P/N ${action}`;
}

export function mainNavigationHint(action = "导航"): string {
	return allowPlainArrowNavigation()
		? `Alt+P/N 或 ↑/↓ ${action}`
		: `Alt+P/N ${action}`;
}
