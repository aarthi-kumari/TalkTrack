const AI_MENTION_RE = /@AI\b/i;
const AI_ADDRESS_RE = /\b(hey |hi |ok |okay )?(ai|assistant)\b[,:]/i;

export function hasAiMention(text: string): boolean {
	return AI_MENTION_RE.test(text);
}

export function looksAddressedToAi(text: string): boolean {
	return hasAiMention(text) || AI_ADDRESS_RE.test(text);
}

export function stripAiMention(text: string): string {
	return text.replace(/@AI\b/gi, "").trim();
}
