import expres from "express";
import dotenv from "dotenv";
import http from "http";

import { initDB } from "./src/db";
import authRoutes from "./src/routes/auth.route";
import classRoutes from "./src/routes/class.route";
import attendanceRoutes from "./src/routes/attendance.route";
import { initWebSocket } from "./src/websockets";

dotenv.config();
const app = expres();
initDB().then(() => console.log("MongoDB connected"));
initWebSocket(app);

app.use(expres.json());

app.use("/auth", authRoutes);
app.use("/class", classRoutes);
app.use("/attendance", attendanceRoutes);

const server = http.createServer(app);
initWebSocket(server);

server.listen(3000, () => {
    console.log("Server started on PORT: 3000");
})