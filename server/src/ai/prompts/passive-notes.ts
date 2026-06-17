export function buildTranscriptClassifierPrompt(params: {
	speaker: string;
	text: string;
}) {
	return `You classify meeting transcript lines for passive note-taking.
Reply with JSON only: {"relevant": boolean, "reason": string}

Mark relevant=true when the line contains decisions, action items, deadlines, commitments, summaries, or substantive discussion worth capturing in meeting notes.
Mark relevant=false for greetings, filler, "can you hear me", or trivial chatter.

Speaker: ${params.speaker}
Line: ${params.text}`;
}

export function buildPassiveNotesPrompt(params: {
	meetingTitle: string;
	transcriptLines: string;
	currentNotesJson: string;
}) {
	return `You are a meeting assistant. Update structured meeting notes from new transcript context.
Return JSON only with this shape:
{
  "summary": "2-4 sentence meeting summary so far",
  "keyPoints": ["bullet", "..."],
  "decisions": ["decision", "..."],
  "actionItems": [{"text": "task", "assignee": "name or null", "due": "date or null"}]
}

Keep prior useful content; refine and merge rather than reset unless transcript contradicts.
Meeting title: ${params.meetingTitle}

Current notes JSON:
${params.currentNotesJson}

Recent transcript (newest last):
${params.transcriptLines}`;
}
