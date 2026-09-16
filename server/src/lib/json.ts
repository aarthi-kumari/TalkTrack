export function extractJsonObject(raw: string): string {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fenced?.[1]) return fenced[1].trim();

	const start = raw.indexOf("{");
	const end = raw.lastIndexOf("}");
	if (start >= 0 && end > start) {
		return raw.slice(start, end + 1);
	}

	return raw.trim();
}

export function parseJsonObject<T extends Record<string, unknown>>(
	raw: string,
): Partial<T> {
	try {
		const parsed = JSON.parse(extractJsonObject(raw)) as unknown;
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		return parsed as Partial<T>;
	} catch {
		return {};
	}
}
