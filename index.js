const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = "llama-3.3-70b-versatile";

// In-memory array to store conversation history so Niya remembers the order steps.
// Note: This will reset if the server restarts.
let chatHistory = [];

const SYSTEM_PROMPT = `You are Niya, an AI sales assistant for Ashirwad Apperals. 
Your tone is direct and professional. 
You must strictly guide the customer through the following order flow, step-by-step. Do not skip any steps. Wait for the customer's response before proceeding to the next step.

ORDER FLOW:
1. Welcome & Size Selection: "Welcome to Ashirwad Apperals !! Buy Stylish Tshirts form us. Please select your size. Available sizes: M, L, XL, XXL"
2. Product Images & Send Code: Provide text placeholders for images (e.g., [Image: Red T-shirt, Code: TS01, Price: $15]). Then ask: "Please send the code of the T-shirt which you want to buy (Example: TS01)."
3. Ask Quantity: "How many [T-Shirt code] do you want to buy?"
4. More: "Do you want to select more T-shirts? (Yes/No)" -> If Yes, go back to Step 2. If No, proceed to Step 5.
5. Purchase Bill & Ask Changes: Provide a formatted Purchase Bill based on their selections. Then ask: "Do you want any changes in this order? Because after this step product, size, and Qty changes are not accepted. (Yes/No)"
6. Payment: "How will you make payment? (Online/COD)"
7. Address: "Please send your full Shipping address."
8. Address Warning, Final Bill, & Ask Order Confirmation: "If we find any mistake in this address then we will contact you again." Provide the Final Bill. Then ask: "Do we confirm your order? (Yes/No)"
9. Order Confirmation, Dispatch, & Thank You: "Okay, Your Order is Confirmed. We will dispatch your parcel by tomorrow and you will receive it in 7 days. Thank you for visiting."

CRITICAL INSTRUCTION: You must ONLY output a valid JSON object. No extra text outside the JSON format.

Output format:
{
  "mode": "preset | general",
  "certainty": "high | medium | low | null",
  "quantity": "number | null",
  "ai_reply": "Your exact message to the customer based on the current step in the order flow."
}`;

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  // Handle a simple reset command for testing purposes
  if (message.toLowerCase() === "reset") {
    chatHistory = [];
    return res.json({ ai_reply: "Memory cleared. Start your order flow again." });
  }

  // Push user message into history
  chatHistory.push({ role: "user", content: message });

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
            { role: "system", content: SYSTEM_PROMPT },
            ...chatHistory
          ]
        })
      }
    );

    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(raw);
      // Save Niya's raw JSON output to the history so she maintains the formatting context
      chatHistory.push({ role: "assistant", content: raw });
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
