import "dotenv/config";
import "./types/express";

import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

import {
	getClerkMiddlewareOptions,
	validateClerkEnv,
} from "./lib/clerk-config";
import livekitRoutes from "./routes/livekit.routes";
import aiRoutes from "./routes/ai.routes";
import meetingRoutes from "./routes/meeting.routes";
import transcriptionRoutes from "./routes/transcription.routes";
import userRoutes from "./routes/user.routes";
import webhookRoutes from "./routes/webhook.routes";
import { registerSocketHandlers } from "./socket/handlers";
import type {
	ClientToServerEvents,
	ServerToClientEvents,
} from "./socket/types";

validateClerkEnv();

const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";

const devOrigins = [
	clientUrl,
	"http://localhost:3000",
	"http://127.0.0.1:3000",
];

const app = express();

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || devOrigins.includes(origin)) {
				callback(null, true);
			} else {
				callback(null, devOrigins[0]);
			}
		},
		credentials: true,
	}),
);

// Clerk webhooks need raw body (before express.json)
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());

app.get("/", (_, res) => {
	res.json({
		message: "Meeting AI Server Running",
	});
});

app.use(clerkMiddleware(getClerkMiddlewareOptions(devOrigins)));

app.use("/api/users", userRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/transcription", transcriptionRoutes);

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
	cors: {
		origin: devOrigins,
		credentials: true,
	},
});

registerSocketHandlers(io);

const port = Number(process.env.PORT) || 5000;

httpServer.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
