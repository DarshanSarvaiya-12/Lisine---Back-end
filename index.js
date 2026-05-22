const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const PRESET_QUESTION = "How many t-shirts do you want to buy?";

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `Input format:
{
  "task": "Check whether the reply clearly answered the preset question.",
  "preset": "How many t-shirts do you want to buy?",
  "reply": "customer message"
}

Output format:
{
  "certainty": "high | medium | low",
  "quantity": "number | null",
  "ai_reply_type": "no_reply | ask_confirmation | Generate response based on reply",
  "ai_reply": "string | null"
}

Respond ONLY in the output format. No extra text.`
              }
            ]
          },
          contents: [
            {
              parts: [{
                text: JSON.stringify({
                  task: "Check whether the reply clearly answered the preset question.",
                  preset: PRESET_QUESTION,
                  reply: message
                })
              }]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = { error: "Parse failed", raw };
    }

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini API failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Lisine running on port ${PORT}`));
