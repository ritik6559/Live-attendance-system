// @ts-nocheck

import {
  describe,
  test,
  expect,
  beforeEach,
} from "bun:test";
import WebSocket from "ws";

const BASE_URL = process.env.SERVER_URL || "http://localhost:3000";
const WS_URL = process.env.WS_URL || "ws://localhost:3000/ws";

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

async function request(method: string, path: string, body: any = null, token: string | null = null) {
  const options: any = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (token) options.headers["Authorization"] = token;
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

function createWsConnection(token?: string) {
  return new Promise<WebSocket>((resolve, reject) => {
    const url = token ? `${WS_URL}?token=${token}` : WS_URL;
    const ws = new WebSocket(url);

    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function waitForWsMessage(ws: WebSocket, timeout = 3000) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket message timeout")), timeout);
    ws.once("message", (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function sendWsMessage(ws: WebSocket, event: string, data = {}) {
  ws.send(JSON.stringify({ event, data }));
}

function uniqueEmail(prefix = "user") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
}

async function createTeacherAndLogin() {
  const email = uniqueEmail("teacher");
  await request("POST", "/auth/signup", {
    name: "Teacher",
    email,
    password: "password123",
    role: "teacher",
  });
  const res = await request("POST", "/auth/login", { email, password: "password123" });
  return { token: res.data.data.token, email };
}

async function createStudentAndLogin() {
  const email = uniqueEmail("student");
  const signup = await request("POST", "/auth/signup", {
    name: "Student",
    email,
    password: "password123",
    role: "student",
  });
  const login = await request("POST", "/auth/login", { email, password: "password123" });
  return { token: login.data.data.token, id: signup.data.data._id };
}

/* --------------------------------------------------
   AUTH
-------------------------------------------------- */

describe("POST /auth/signup", () => {
  test("creates student", async () => {
    const email = uniqueEmail();
    const res = await request("POST", "/auth/signup", {
      name: "John",
      email,
      password: "password123",
      role: "student",
    });

    expect(res.status).toBe(201);
    expect(res.data.success).toBe(true);
    expect(res.data.data.email).toBe(email);
  });

  test("rejects duplicate email", async () => {
    const email = uniqueEmail();
    await request("POST", "/auth/signup", {
      name: "A",
      email,
      password: "password123",
      role: "student",
    });

    const res = await request("POST", "/auth/signup", {
      name: "B",
      email,
      password: "password123",
      role: "teacher",
    });

    expect(res.status).toBe(400);
    expect(res.data.error).toBe("Email already exists");
  });
});

describe("POST /auth/login", () => {
  let email: string;

  beforeEach(async () => {
    email = uniqueEmail();
    await request("POST", "/auth/signup", {
      name: "User",
      email,
      password: "password123",
      role: "student",
    });
  });

  test("returns JWT", async () => {
    const res = await request("POST", "/auth/login", {
      email,
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.data.data.token).toBeDefined();
  });

  test("rejects wrong password", async () => {
    const res = await request("POST", "/auth/login", {
      email,
      password: "wrong",
    });

    expect(res.status).toBe(400);
  });
});

/* --------------------------------------------------
   CLASS
-------------------------------------------------- */

describe("POST /class", () => {
  test("teacher can create class", async () => {
    const { token } = await createTeacherAndLogin();
    const res = await request("POST", "/class", { className: "Math" }, token);

    expect(res.status).toBe(201);
    expect(res.data.data.className).toBe("Math");
  });

  test("student forbidden", async () => {
    const { token } = await createStudentAndLogin();
    const res = await request("POST", "/class", { className: "Math" }, token);

    expect(res.status).toBe(403);
  });
});

/* --------------------------------------------------
   ATTENDANCE HTTP
-------------------------------------------------- */

describe("POST /attendance/start", () => {
  test("starts session", async () => {
    const { token } = await createTeacherAndLogin();
    const cls = await request("POST", "/class", { className: "Math" }, token);

    const res = await request(
      "POST",
      "/attendance/start",
      { classId: cls.data.data._id },
      token
    );

    expect(res.status).toBe(200);
    expect(res.data.data.startedAt).toBeDefined();
  });
});

/* --------------------------------------------------
   WEBSOCKET
-------------------------------------------------- */

describe("WebSocket - Attendance Flow", () => {
  test("teacher marks present and student receives update", async () => {
    const { token: teacherToken } = await createTeacherAndLogin();
    const { token: studentToken, id: studentId } = await createStudentAndLogin();

    const cls = await request("POST", "/class", { className: "Math" }, teacherToken);
    const classId = cls.data.data._id;

    await request("POST", `/class/${classId}/add-student`, { studentId }, teacherToken);
    await request("POST", "/attendance/start", { classId }, teacherToken);

    const teacherWs = await createWsConnection(teacherToken);
    const studentWs = await createWsConnection(studentToken);

    sendWsMessage(teacherWs, "ATTENDANCE_MARKED", {
      studentId,
      status: "present",
    });

    const teacherMsg = await waitForWsMessage(teacherWs);
    const studentMsg = await waitForWsMessage(studentWs);

    expect(teacherMsg.event).toBe("ATTENDANCE_MARKED");
    expect(studentMsg.data.status).toBe("present");

    teacherWs.close();
    studentWs.close();
  });

  test("student cannot mark attendance", async () => {
    const { token: studentToken, id } = await createStudentAndLogin();
    const ws = await createWsConnection(studentToken);

    sendWsMessage(ws, "ATTENDANCE_MARKED", {
      studentId: id,
      status: "present",
    });

    const msg = await waitForWsMessage(ws);
    expect(msg.event).toBe("ERROR");

    ws.close();
  });

  test("unknown event returns error", async () => {
    const { token } = await createTeacherAndLogin();
    const ws = await createWsConnection(token);

    sendWsMessage(ws, "UNKNOWN_EVENT");
    const msg = await waitForWsMessage(ws);

    expect(msg.event).toBe("ERROR");
    expect(msg.data.message).toBe("Unknown event");

    ws.close();
  });
});
