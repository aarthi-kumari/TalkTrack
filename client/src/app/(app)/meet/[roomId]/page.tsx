import dynamic from "next/dynamic";

import { Loading } from "@/components/ui/Loading";

const MeetingClient = dynamic(
	() => import("./MeetingClient").then((mod) => mod.MeetingClient),
	{
		loading: () => <Loading label="Loading meeting room…" />,
	},
);

type MeetPageProps = {
	params: Promise<{ roomId: string }>;
};

export default async function MeetPage({ params }: MeetPageProps) {
	const { roomId } = await params;

	return <MeetingClient roomId={roomId} />;
}
