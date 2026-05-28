import type { ChatEntry } from "../types";

export interface TranscriptGroup {
	entries: ChatEntry[];
	startsWithUser: boolean;
}

export function isUserPromptEntry(entry: ChatEntry): boolean {
	return (
		entry.kind === "user" ||
		(entry.kind === "user_submitted" && entry.delivery == null)
	);
}

export function groupTranscriptEntries(
	entries: ChatEntry[],
): TranscriptGroup[] {
	const groups: TranscriptGroup[] = [];
	let current: TranscriptGroup | undefined;

	for (const entry of entries) {
		if (isUserPromptEntry(entry) || !current) {
			current = {
				entries: [entry],
				startsWithUser: isUserPromptEntry(entry),
			};
			groups.push(current);
			continue;
		}

		current.entries.push(entry);
	}

	return groups;
}

export function shouldInsertTranscriptEntrySpacer(
	previous: ChatEntry,
	current: ChatEntry,
): boolean {
	if (isUserPromptEntry(previous)) return true;
	if (current.kind === "done") return true;

	if (
		previous.kind === current.kind &&
		(current.kind === "assistant_text" ||
			current.kind === "reasoning" ||
			current.kind === "status" ||
			current.kind === "team")
	) {
		return false;
	}

	return true;
}
