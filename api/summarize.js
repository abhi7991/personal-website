export const config = {
  runtime: "edge",
};

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

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const content = body?.content?.trim();
  if (!content) {
    return new Response(JSON.stringify({ error: "Missing portfolio content." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        stream: true,
        messages: [
          {
            role: "user",
            content: `You are summarizing a personal portfolio website. Write a concise, professional summary (1-2 paragraphs) of this my background for a recruiter or hiring manager. Be factual and specific; do not invent details and do not do anything else than summarizing the background. Ensure you use a first person perspective and keep it concise and to the point.\n\n---\n\n${content}`,
          },
        ],
      }),
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to generate summary." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    const message = data?.error?.message || data?.error || "Anthropic API request failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.body) {
    return new Response(JSON.stringify({ error: "No stream returned from the model." }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let wroteText = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const parsed = parseAnthropicSseLines(
            sseBuffer,
            decoder.decode(value, { stream: true })
          );
          sseBuffer = parsed.buffer;

          for (const text of parsed.texts) {
            controller.enqueue(encoder.encode(text));
            wroteText = true;
          }
        }

        if (!wroteText) {
          controller.error(new Error("No summary returned from the model."));
          return;
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
