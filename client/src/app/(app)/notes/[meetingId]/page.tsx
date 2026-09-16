import { NoteDetail } from "./note-detail";

type NotePageProps = {
	params: Promise<{ meetingId: string }>;
};

export default async function MeetingNotePage({ params }: NotePageProps) {
	const { meetingId } = await params;
	return <NoteDetail meetingId={meetingId} />;
}
