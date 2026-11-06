// Local SMTP sink for HTTP acceptance tests. Never sends mail outside loopback.
import net from "node:net";
import fs from "node:fs/promises";
const file = new URL("../.local/email-test-mailbox.json", import.meta.url);
await fs.mkdir(new URL("../.local/", import.meta.url), { recursive: true });
const messages = [];
await fs.writeFile(file, "[]");
net
  .createServer((socket) => {
    let buffer = "",
      data = false,
      message = "";
    socket.setEncoding("utf8");
    socket.write("220 localhost QuestMart test SMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk;
      while (buffer.includes("\r\n")) {
        const end = buffer.indexOf("\r\n"),
          line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === ".") {
            data = false;
            messages.push(message);
            message = "";
            fs.writeFile(file, JSON.stringify(messages)).then(() =>
              socket.write("250 queued locally\r\n"),
            );
          } else message += line + "\r\n";
        } else if (/^EHLO|^HELO/i.test(line))
          socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
        else if (/^AUTH/i.test(line)) socket.write("235 authenticated\r\n");
        else if (/^MAIL|^RCPT|^RSET|^NOOP/i.test(line))
          socket.write("250 OK\r\n");
        else if (/^DATA/i.test(line)) {
          data = true;
          socket.write("354 end with dot\r\n");
        } else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
    socket.on("error", () => {});
  })
  .listen(1587, "127.0.0.1", () =>
    console.log(
      "Local-only SMTP capture ready on 127.0.0.1:1587. Mail content stays in ignored .local/.",
    ),
  );
