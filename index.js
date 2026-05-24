const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

app.post("/chat", async (req, res) => {
  // Destructure 'preset' and 'reply' from the incoming request body
  const { preset, reply } = req.body;

  if (!reply || !preset) {
    return res.status(400).json({ error: "Both preset and reply are required." });
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
          messages: [
            {
              role: "system",
              content: `You are a validation assistant for a t-shirt e-commerce chatbot.
Your job is to analyze if the customer's reply actually answers the preset question asked by the system.

Input format:
{
  "preset": "The question asked by the bot",
  "reply": "The customer's response"
}

Output format:
{
  "is_answered": "Yes" | "No"
}

            },
            {
              role: "user",
              content: JSON.stringify({
                preset: preset,
                reply: reply
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

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Groq API failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening running on port ${PORT}`));
