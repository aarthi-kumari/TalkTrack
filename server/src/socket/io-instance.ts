import type { Server } from "socket.io";

import type { MeetingNoteDto } from "../services/notes.service";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

let socketServer: AppServer | null = null;

export function setSocketServer(io: AppServer) {
	socketServer = io;
}

export function getSocketServer(): AppServer | null {
	return socketServer;
}

export function emitNoteUpdated(roomId: string, note: MeetingNoteDto) {
	socketServer?.to(`room:${roomId}`).emit("note_updated", { note });
}
