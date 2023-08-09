import { createServer } from "http";
import { readFileSync } from "fs";
import WebSocket from "ws";

const envFileContent = readFileSync(".env", "utf-8");
const envVars = envFileContent.split("\n").reduce((acc, line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    acc[key.trim()] = value.trim();
  }
  return acc;
}, {});

let token = envVars.TOKEN;
let channelId = envVars.CHANNELID;
let clydeID = envVars.CLYDEID;
let botID = envVars.BOTID;
let messages = [];
let sequence = 0;
let session_id = "";
let heartRec = true;
let socket = "wss://gateway.discord.gg/?v=11&encoding=json";

const identifyPayload = {
  op: 2,
  d: {
    token: token,
    properties: {
      $os: "linux",
      $browser: "github.com/9xN",
      $device: "github.com/9xN",
    },
  },
};

const heartPayload = {
  op: 1,
  d: "sequence",
};

const resumePayload = {
  op: 6,
  d: {
    token: "token",
    session_id: "session_id",
    seq: "sequence",
  },
};

async function connect() {
  const ws = new WebSocket(socket);
  ws.on("open", () => {
    console.log("Discord client connected");
    ws.on("message", (message) => {
      evaluate(JSON.parse(message), ws);
    });
  });
  ws.on("close", (code, reason) => {
    console.log(
      `Discord client disconnected with code:${code}\nReason: ${reason}`
    );
    heartRec = true;
    reconnect(ws);
  });
}

async function evaluate(message, ws) {
  const opcode = message.op;
  switch (opcode) {
    case 10:
      const heartbeat_interval = message.d.heartbeat_interval;
      heartbeat(heartbeat_interval, ws);
      if (session_id) resume(ws);
      else identify(ws);
      break;
    case 11:
      heartRec = true;
      break;
    case 0:
      let t = message.t;
      sequence = message.s;
      if (t === "READY") {
        session_id = message.d.session_id;
      }
      if (t === "MESSAGE_CREATE") {
        if (
          message.d.author.id == clydeID &&
          message.d.referenced_message.author.id == botID
        ) {
          const { content } = message.d;
          const { id } = message.d.referenced_message;
          messages.push({ content, id });
          //console.log(message.d)
        }
      }
      break;
    case 1:
      heartPayload.d = sequence;
      ws.send(JSON.stringify(heartPayload));
      break;
  }
}

async function heartbeat(interval, ws) {
  const timer = setInterval(() => {
    if (heartRec) {
      heartPayload.d = sequence;
      ws.send(JSON.stringify(heartPayload));
      heartRec = false;
    } else {
      heartRec = true;
      clearInterval(timer);
      reconnect(ws);
    }
  }, interval);
}

async function identify(ws) {
  identifyPayload.d.token = token;
  ws.send(JSON.stringify(identifyPayload));
}

async function resume(ws) {
  resumePayload.d.token = token;
  resumePayload.d.session_id = session_id;
  resumePayload.d.seq = sequence;
  ws.send(JSON.stringify(resumePayload));
}

async function reconnect(ws) {
  ws.close();
  connect();
}

connect();

function removeMessage(id) {
  const index = messages.findIndex((message) => message.id === id);
  if (index !== -1) {
    messages.splice(index, 1);
    return true;
  }
  return false;
}

const server = createServer((req, res) => {
  const { method, url, headers } = req;

  if (method === "GET" && url === "/get-messages") {
    res
      .writeHead(200, { "Content-Type": "application/json" })
      .end(JSON.stringify(messages));
  } else if (method === "POST" && url === "/send-message") {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", async () => {
      try {
        const { message } = JSON.parse(data);

        if (!message) {
          return res
            .writeHead(400, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Message is missing." }));
        }

        const response = await fetch(
          `https://discord.com/api/v10/channels/${channelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
              "x-super-properties":
                "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiRGlzY29yZCBDbGllbnQiLCJyZWxlYXNlX2NoYW5uZWwiOiJjYW5hcnkiLCJjbGllbnRfdmVyc2lvbiI6IjEuMC43MyIsIm9zX3ZlcnNpb24iOiIxMC4wLjIyNjIxIiwib3NfYXJjaCI6Ing2NCIsInN5c3RlbV9sb2NhbGUiOiJlbi1VUyIsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChXaW5kb3dzIE5UIDEwLjA7IFdPVzY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBkaXNjb3JkLzEuMC43MyBDaHJvbWUvMTA4LjAuNTM1OS4yMTUgRWxlY3Ryb24vMjIuMy4xMiBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMjIuMy4xMiIsImNsaWVudF9idWlsZF9udW1iZXIiOjIxODUyMiwibmF0aXZlX2J1aWxkX251bWJlciI6MzU0OTQsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGx9",
            },
            body: JSON.stringify({ content: "@Clyde " + message }),
          }
        );

        if (response.status !== 200) {
          return res
            .writeHead(500, { "Content-Type": "application/json" })
            .end(
              JSON.stringify({
                error: "Failed to send the message. Please try again later.",
              })
            );
        }

        const reply = await response.json();
        res
          .writeHead(200, { "Content-Type": "application/json" })
          .end(JSON.stringify({ reply }));
      } catch (error) {
        console.error("Error:", error);
        res
          .writeHead(500, { "Content-Type": "application/json" })
          .end(
            JSON.stringify({
              error: "Internal server error. Please contact the administrator.",
            })
          );
      }
    });
  } else if (method === "DELETE" && url === "/remove-message") {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      try {
        const { id } = JSON.parse(data);

        // Call a function to handle message deletion
        const success = removeMessage(id);
        if (success) {
          res
            .writeHead(200, { "Content-Type": "application/json" })
            .end(JSON.stringify({ message: "Message removed successfully." }));
        } else {
          res
            .writeHead(404, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Message not found." }));
        }
      } catch (error) {
        console.error("Error:", error);
        res
          .writeHead(400, { "Content-Type": "application/json" })
          .end(JSON.stringify({ error: "Invalid request data." }));
      }
    });
  } else {
    res
      .writeHead(404, { "Content-Type": "text/plain" })
      .end("Endpoint not found.");
  }
});

const port = 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
