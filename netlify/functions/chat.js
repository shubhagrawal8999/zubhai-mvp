export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const { message } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ reply: "Please type a message." }),
      };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content:
              "You are Aira, a friendly AI assistant for Zubhai. Explain AI automation simply. Focus on boring business tasks like emails and invoices.",
          },
          { role: "user", content: message },
        ],
        temperature: 0.4,
        max_tokens: 150,
      }),
    });

    const data = await response.json();

    if (!data.choices) {
      return {
        statusCode: 500,
        body: JSON.stringify({ reply: "AI did not respond correctly." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        reply: data.choices[0].message.content,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        reply: "Server error. Please try again later.",
      }),
    };
  }
};
