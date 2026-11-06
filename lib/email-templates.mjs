const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const content = {
  verify: [
    "Activate your player account",
    "One last checkpoint.",
    "Verify your email to unlock your QuestMart account. This link expires in 24 hours.",
    "Verify my email",
    "01 / ACCOUNT ACTIVATION",
  ],
  welcome: [
    "Welcome to QuestMart",
    "Your next quest starts here.",
    "Your email is verified. Discover new worlds, trade your finished games, and find your next adventure.",
    "Explore QuestMart",
    "02 / PLAYER READY",
  ],
  reset: [
    "Reset your QuestMart password",
    "Respawn your access.",
    "Choose a new password to get back into your account. This link expires in 30 minutes. If you did not request this, ignore this message.",
    "Reset my password",
    "ACCOUNT RECOVERY",
  ],
};
export function emailTemplate(kind, username, url) {
  if (!content[kind]) throw new Error("Unknown email template");
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol))
    throw new Error("Invalid email link");
  const [subject, heading, body, button, eyebrow] = content[kind];
  const name = escape(username),
    link = escape(url);
  return {
    subject: `${subject} — QuestMart`,
    text: `QUESTMART\n${eyebrow}\n\nHi ${username},\n\n${heading}\n${body}\n\n${button}: ${url}\n\nNever share your password or this link.\nQuestMart · Keep the game going.`,
    html: `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="UTF-8"><title>${escape(subject)}</title></head><body style="margin:0;background:#060b13;color:#edf3e7;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escape(heading)} ${escape(body)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060b13"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;border:1px solid #304451;border-radius:16px;overflow:hidden;background:#101b2a"><tr><td style="height:4px;background:#c1ef76"></td></tr><tr><td style="padding:28px 28px 22px;font-size:24px;font-weight:800;color:#c1ef76">Q↗ questmart<span style="font-size:12px;color:#9aabc2"> ®</span></td></tr><tr><td style="padding:20px 28px 32px"><p style="font:11px monospace;letter-spacing:2px;color:#a99bf3">${eyebrow}</p><h1 style="font-size:34px;line-height:1.12;letter-spacing:-1px;color:#f3f7ed;margin:24px 0">${escape(heading)}</h1><p style="font-size:15px;color:#c1ef76">Hi ${name},</p><p style="font-size:15px;line-height:1.8;color:#bac9d8">${escape(body)}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr><td bgcolor="#c1ef76" style="border-radius:5px"><a href="${link}" style="display:inline-block;padding:16px 24px;color:#111b13;font-size:14px;font-weight:bold;text-decoration:none">${button} ↗</a></td></tr></table><p style="font-size:11px;line-height:1.8;color:#94a8bc;word-break:break-all">Button not working? Copy this link:<br><a href="${link}" style="color:#b8d2db">${link}</a></p><div style="height:1px;background:#304451;margin:28px 0"></div><p style="font-size:11px;line-height:1.8;color:#8ca0b6">Never share your password or this link. QuestMart will never ask you to send your password by email.</p></td></tr><tr><td style="padding:22px 28px;background:#0b1320;font-size:10px;color:#8ea3b9;letter-spacing:1px">PLAY. PASS. REPEAT.<br><br>QUESTMART / KEEP THE GAME GOING.</td></tr></table></td></tr></table></body></html>`,
  };
}
