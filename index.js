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

  const inputPayload = {
    task: "Check whether the reply clearly answered the preset question.",
    preset: PRESET_QUESTION,
    reply: message
  };

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
                text: `You are an AI that analyzes customer replies.

You will receive input in this exact JSON format:
{
  "task": "Check whether the reply clearly answered the preset question.",
  "preset": "the question that was asked to the customer",
  "reply": "the customer's message"
}

You must respond ONLY in this exact JSON format, no extra text, no markdown, no backticks:
{
  "certainty": "high | medium | low",
  "quantity": "number | null",
  "ai_reply_type": "no_reply | ask_confirmation | give_answer",
  "ai_reply": "string | null"
}

Rules:
- certainty "high" = customer clearly stated a number
- certainty "medium" = customer implied a quantity but not clearly
- certainty "low" = customer did not answer or answer is unclear
- quantity = extract the number if mentioned, otherwise null
- ai_reply_type:
    "no_reply" = certainty is high, no need to ask again
    "ask_confirmation" = certainty is medium, confirm the number
    "give_answer" = certainty is low, ask the preset question again politely
- ai_reply = the message to send back to the customer, or null if no_reply`
              }
            ]
          },
          contents: [
            {
              parts: [{ text: JSON.stringify(inputPayload) }]
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
      parsed = { error: "Failed to parse Gemini response.", raw };
    }

    res.json(parsed);

  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Failed to contact Gemini API." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lisine backend running on port ${PORT}`);
});
