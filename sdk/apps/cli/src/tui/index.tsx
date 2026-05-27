import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { resolveOpenTuiInputMode } from "./opentui-env";
import { Root } from "./root";
import { installTuiStdioCapture } from "./stdio-capture";
import type { TuiProps } from "./types";

export type { TuiProps } from "./types";

export async function renderOpenTui(
	props: TuiProps,
): Promise<{ destroy: () => void; waitUntilExit: () => Promise<void> }> {
	const inputMode = resolveOpenTuiInputMode();
	const renderer = await createCliRenderer({
		exitOnCtrlC: false,
		autoFocus: inputMode.autoFocus,
		enableMouseMovement: inputMode.enableMouseMovement,
		screenMode: inputMode.screenMode,
		useMouse: inputMode.useMouse,
	});
	const restoreStdio = installTuiStdioCapture();

	const detectedPalette = await renderer
		.getPalette({ timeout: 150 })
		.catch(() => null);
	const terminalBackground = detectedPalette?.defaultBackground ?? null;
	const terminalForeground = detectedPalette?.defaultForeground ?? null;

	let root: ReturnType<typeof createRoot>;
	try {
		root = createRoot(renderer);
		root.render(
			<Root
				{...props}
				terminalBackground={terminalBackground}
				terminalForeground={terminalForeground}
			/>,
		);
	} catch (error) {
		restoreStdio();
		renderer.destroy();
		throw error;
	}

	let resolveExit: (() => void) | undefined;
	const exitPromise = new Promise<void>((resolve) => {
		resolveExit = resolve;
	});

	let unmounted = false;
	const unmountRoot = () => {
		if (unmounted) {
			return;
		}
		unmounted = true;
		root.unmount();
	};

	renderer.on("destroy", () => {
		unmountRoot();
		restoreStdio();
		resolveExit?.();
	});

	let destroyStarted = false;
	const destroy = () => {
		if (destroyStarted) {
			return;
		}
		destroyStarted = true;
		unmountRoot();
		// Let OpenTUI finish parsing the current stdin batch before teardown.
		queueMicrotask(() => {
			renderer.destroy();
		});
	};

	return {
		destroy,
		waitUntilExit: () => exitPromise,
	};
}
