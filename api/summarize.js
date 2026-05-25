function parseAnthropicSseLines(buffer, chunk) {
  buffer += chunk;
  const parts = buffer.split("\n");
  const remainder = parts.pop() ?? "";
  const texts = [];

  for (const line of parts) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;

    let data;
    try {
      data = JSON.parse(payload);
    } catch {
      continue;
    }

    if (data.type === "error") {
      throw new Error(data.error?.message || "Anthropic stream error.");
    }
    if (data.type === "content_block_delta" && data.delta?.text) {
      texts.push(data.delta.text);
    }
  }

  return { buffer: remainder, texts };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }

  const content = body?.content?.trim();
  if (!content) {
    return res.status(400).json({ error: "Missing portfolio content." });
  }

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        stream: true,
        messages: [
          {
            role: "user",
            content: `You are summarizing a personal portfolio website. Write a concise, professional third-person summary (2–3 short paragraphs) of this person's background for a recruiter or hiring manager. Be factual and specific; do not invent details and do not do anything else than summarizing the background.\n\n---\n\n${content}`,
          },
        ],
      }),
    });
  } catch {
    return res.status(500).json({ error: "Failed to generate summary." });
  }

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    const message =
      data?.error?.message || data?.error || "Anthropic API request failed.";
    return res.status(upstream.status).json({ error: message });
  }

  if (!upstream.body) {
    return res.status(502).json({ error: "No stream returned from the model." });
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let wroteText = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const parsed = parseAnthropicSseLines(sseBuffer, decoder.decode(value, { stream: true }));
      sseBuffer = parsed.buffer;

      for (const text of parsed.texts) {
        res.write(text);
        wroteText = true;
      }
    }

    if (!wroteText) {
      res.statusCode = 502;
      res.end("No summary returned from the model.");
      return;
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({
        error: err.message || "Failed to generate summary.",
      });
    }
    res.end();
  }
}
