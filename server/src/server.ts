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
import meetingRoutes from "./routes/meeting.routes";
import userRoutes from "./routes/user.routes";
import webhookRoutes from "./routes/webhook.routes";

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

const httpServer = createServer(app);

const io = new Server(httpServer, {
	cors: {
		origin: clientUrl,
		credentials: true,
	},
});

io.on("connection", (socket) => {
	console.log("Client Connected:", socket.id);

	socket.on("disconnect", () => {
		console.log("Disconnected:", socket.id);
	});
});

const port = Number(process.env.PORT) || 5000;

httpServer.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
