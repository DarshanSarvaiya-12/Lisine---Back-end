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
          temperature: 0, // Lower temperature makes the model much more precise and strict
          messages: [
            {
              role: "system",
              content: `Instruction: Check if the customer reply directly answers the preset question.

Input format:
{
  "preset": "How many t-shirt do you want to buy ?",
  "reply": "customer response string"
}

Output format:
{
  "is_answered": "Yes | No"
}`
            },
            {
              role: "user",
              content: JSON.stringify({ preset, reply })
            }
          ]
        })
      }
    );

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";

    // Extract raw token usage statistics from Groq API
    const promptTokens = data?.usage?.prompt_tokens || 0;
    const completionTokens = data?.usage?.completion_tokens || 0;
    const totalTokens = data?.usage?.total_tokens || 0;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = { error: "Parse failed", raw };
    }

    // Merge the AI's answer with the real-time token tracking data
    res.json({
      ...parsed,
      token_usage: {
        input_tokens: promptTokens,
        output_tokens: completionTokens,
        total_tokens: totalTokens
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Groq API failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening running on port ${PORT}`));
