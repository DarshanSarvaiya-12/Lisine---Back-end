const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

app.post("/chat", async (req, res) => {
  const { step, expected, message } = req.body;

  if (!message) {
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
          messages: [
            {
              role: "system",
              content: `You are a t-shirt e-commerce chatbot assistant.

Input format:
{
  "step": "current step name",
  "expected": "code | number | yes_no | address | okay | null",
  "reply": "customer message"
}

Output format:
{
  "command": "NEXT_STEP | REPEAT | ANSWER | SUPPORT_MODE",
  "extract": "value | null",
  "ai_reply": "string | null"
}

Respond ONLY in the output format. No extra text.`
            },
            {
              role: "user",
              content: JSON.stringify({
                step: step,
                expected: expected,
                reply: message
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
app.listen(PORT, () => console.log(`Lisine running on port ${PORT}`));
