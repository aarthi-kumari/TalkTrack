import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    message: "Meeting AI Server Running",
  });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("Client Connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

httpServer.listen(5000, () => {
  console.log("Server running on port 5000");
});