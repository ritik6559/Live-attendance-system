import { WebSocket } from "ws";
import jwt from "jsonwebtoken";

import { Class } from "../models/class.mode";
import { Attendance } from "../models/attendance.mode";
import { activeSession, clearSession } from "../controllers/attendance.controller";
import type { Request } from "express";

declare global {
    namespace WebSocketCustom {
        interface WebSocket {
            user?: {
                userId: string,
                role: string
            };
        }
    }
}

export const initWebSocket = (server: any) => {

    const wss = new WebSocket.Server({ server, path: "/ws" });

    wss.on("connection", (ws: WebSocket & { user?: any }, req: Request) => {
        try {

            console.log("Hello")

            const token = new URL(req.url, "http://x").searchParams.get("token");

            if (!token) {
                ws.send(JSON.stringify({ event: "ERROR", data: { message: "Unauthorized or invalid token" } }));
                ws.close();
                return;
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET!);
            ws.user = decoded;

        } catch {
            ws.send(JSON.stringify({ event: "ERROR", data: { message: "Unauthorized or invalid token" } }));
            ws.close();
            return;
        }

        ws.on("message", async (msg: string) => {

            const { event, data } = JSON.parse(msg);

            if (event === "ATTENDANCE_MARKED") {

                if (ws.user?.role !== "teacher") {
                    ws.send(JSON.stringify({ event: "ERROR", data: { message: "Forbidden, teacher only" } }));
                    ws.close();
                    return;
                }

                if (!activeSession) {
                    ws.send(JSON.stringify({ event: "ERROR", data: { message: "No active session" } }));
                    ws.close();
                    return;
                }

                const { studentId, status } = data;
                
                activeSession.attendance[studentId] = status;
                console.log(JSON.parse(msg));
                wss.clients.forEach(c => c.send(msg));
            }

            if (event === "TODAY_SUMMARY") {

                if (ws.user?.role !== "teacher") {
                    ws.send(JSON.stringify({ event: "ERROR", data: { message: "Forbidden, teacher only" } }));
                    ws.close();
                    return;
                }

                if (!activeSession) {
                    ws.send(JSON.stringify({ event: "ERROR", data: { message: "No active session" } }));
                    ws.close();
                    return;
                }

                const values = Object.values(activeSession.attendance);
                const present = values.filter(v => v === "present").length;
                const absent = values.filter(v => v === "absent").length;

                wss.clients.forEach(c =>
                    c.send(JSON.stringify({
                        event,
                        data: {
                            present,
                            absent,
                            total: present + absent
                        }
                    }))
                );
            }

            if (event === "MY_ATTENDANCE") {

                if (ws.user?.role !== "student") {
                    ws.send(JSON.stringify({ event: "ERROR", data: { message: "Forbidden, student only" } }));
                    ws.close();
                    return;
                }

                const status = activeSession?.attendance[ws.user.userId];

                ws.send(JSON.stringify({
                    event,
                    data: { status: status ?? "not yet updated" }
                }));
            }

            if (event === "DONE") {

                if (ws.user?.role !== "teacher") {
                    ws.send(JSON.stringify({ event: "ERROR", data: { message: "Forbidden, teacher only" } }));
                    ws.close();
                    return;
                }

                const cls = await Class.findById(activeSession.classId);

                if (!cls) {
                    ws.send(JSON.stringify({ event: "ERROR", data: { message: "Class not found" } }));
                    ws.close();
                    return;
                }

                for (const sid of cls.studentIds) {

                    await Attendance.create({
                        classId: cls._id,
                        studentId: sid,
                        status: activeSession.attendance[sid.toString()] || "absent"
                    });

                }

                const values = Object.values(activeSession.attendance);
                const present = values.filter(v => v === "present").length;
                const absent = values.filter(v => v === "absent").length;

                clearSession();

                wss.clients.forEach(c =>
                    c.send(JSON.stringify({
                        event: "DONE",
                        data: {
                            message: "Attendance persisted",
                            present, absent,
                            total: present + absent
                        }
                    }))
                );
            }
            else {
                ws.send(JSON.stringify({ event: "ERROR", data: { message: "Unknown event" } }));
                ws.close();
                return;
            }

        });
    });
};
