import type { InputRenderable, MouseEvent } from "@opentui/core";
import { useCallback, useRef } from "react";

export function useTouchInputFocus(onFocusRequest?: () => void) {
	const inputRef = useRef<InputRenderable | null>(null);

	const pulseFocus = useCallback((input: InputRenderable) => {
		input.blur();
		queueMicrotask(() => {
			if (inputRef.current === input) {
				input.focus();
			}
		});
	}, []);

	const focusLatest = useCallback(() => {
		const input = inputRef.current;
		if (input) {
			pulseFocus(input);
		}
	}, [pulseFocus]);

	const setInputRef = useCallback(
		(input: InputRenderable | null) => {
			inputRef.current = input;
			if (input) {
				pulseFocus(input);
			}
		},
		[pulseFocus],
	);

	const requestInputFocus = useCallback(
		(_event?: MouseEvent) => {
			onFocusRequest?.();

			focusLatest();
			queueMicrotask(() => {
				focusLatest();
			});
			setTimeout(focusLatest, 0);
		},
		[focusLatest, onFocusRequest],
	);

	return { inputRef, setInputRef, requestInputFocus };
}
