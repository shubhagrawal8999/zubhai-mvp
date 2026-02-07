// /api/chat.js - Vercel Serverless Function
export default async function handler(req, res) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method Not Allowed',
      reply: "I can only process chat messages via POST requests."
    });
  }

  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        success: false, 
        reply: "Please provide a valid message.",
        conversationId
      });
    }

    // Validate message length
    if (message.length > 1000) {
      return res.status(400).json({ 
        success: false, 
        reply: "Your message is too long. Please keep it under 1000 characters.",
        conversationId
      });
    }

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      return res.status(500).json({ 
        success: false, 
        reply: "I'm currently experiencing technical difficulties. Please try again later.",
        conversationId
      });
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system",
        content: `You are Aira, a friendly and helpful AI assistant for Zubhai, a company that helps small businesses automate boring tasks.
        
        About Zubhai:
        - Helps businesses automate repetitive tasks like invoicing, emails, data entry
        - Offers AI workflow automation, chatbots, email automation
        - Provides custom business automation solutions
        - Founder-led, focused on practical solutions
        
        Your personality:
        - Friendly, professional, and empathetic
        - Focus on helping small businesses
        - Keep responses concise and helpful
        - If you don't know something, admit it and offer to connect them with a human
        
        Response guidelines:
        - Answer questions about business automation
        - Explain how Zubhai can help
        - Offer to schedule a consultation for detailed discussions
        - Keep responses under 3 paragraphs
        - Use bullet points when helpful
        - Always be encouraging and positive
        
        If asked about pricing, say: "Pricing varies based on your specific needs. I'd be happy to schedule a free consultation to discuss your requirements and provide accurate pricing."
        
        End every response with: "Is there anything specific about your business automation needs you'd like to discuss?"`
      },
      {
        role: "user",
        content: message
      }
    ];

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      
      if (response.status === 429) {
        return res.status(429).json({
          success: false,
          reply: "I'm getting too many requests right now. Please try again in a moment.",
          conversationId
        });
      }
      
      throw new Error(`OpenAI API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI');
    }

    const aiReply = data.choices[0].message.content;

    // Return successful response
    return res.status(200).json({
      success: true,
      reply: aiReply,
      conversationId: conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // User-friendly error message
    return res.status(500).json({
      success: false,
      reply: "I apologize, but I'm having trouble processing your request right now. This could be due to temporary technical issues. Please try again in a few moments, or you can email us directly at support@zubhai.com for assistance.",
      conversationId: req.body?.conversationId
    });
  }
}
