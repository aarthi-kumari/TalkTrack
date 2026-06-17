import type { Server } from "socket.io";

let socketServer: Server | null = null;

export function setSocketServer(io: Server) {
	socketServer = io;
}

export function getSocketServer(): Server | null {
	return socketServer;
}

export function emitNoteUpdated(roomId: string, note: unknown) {
	socketServer?.to(`room:${roomId}`).emit("note_updated", { note });
}
