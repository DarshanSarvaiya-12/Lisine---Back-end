const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

app.post("/chat", async (req, res) => {
  const { preset, reply } = req.body;

  if (!reply) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const response = await fetch(
      `https://api.groq.com/openai/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0,
          messages: [
            {
              role: "system",
              content: `You are a t-shirt e-commerce chatbot assistant.

Input format:
{
  "Preset": "string",
  "Reply": "string"
}

Output format:
{
  "Is Reply answer the Preset ?": "Yes / No"
}

Respond ONLY in the output format. No extra text.`
            },
            {
              role: "user",
              content: JSON.stringify({
                Preset: preset,
                Reply: reply
              })
            }
          ]
        })
      }
    );

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = { error: "Parse failed", raw };
    }

    // Returning the AI's response alongside total token counts
    res.json({
      ...parsed,
      usage: {
        prompt_tokens: data?.usage?.prompt_tokens || 0,
        completion_tokens: data?.usage?.completion_tokens || 0,
        total_tokens: data?.usage?.total_tokens || 0
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Groq API failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lisine running on port ${PORT}`));
