import cors from "cors";
import "dotenv/config";
import express from "express";
import { apikey, serverClient } from "./serverClient";
import { createAgent } from "./agents/createAgent";
import { AgentPlatform, AIAgent } from "./agents/types";

const app = express();
app.use(express.json());
app.use(cors());
app.use(cors({ origin: "*" }));

const activeAgents = new Map<string, AIAgent>();
app.get("/", (req, res) => {
  res.json({
    message: "Server is running",
    apikey: apikey,
  });
});

app.post("/api/token", (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const token = serverClient.createToken(userId);
    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

app.post("/api/channel", async (req, res) => {
  try {
    const { userId, channelType = "messaging", channelId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const finalChannelId = channelId || `ai-chat-${userId}`;
    const agentKey = `${finalChannelId}-${userId}`;

    if (activeAgents.has(agentKey)) {
      return res.json({
        channelId: finalChannelId,
        channelType,
        message: "Channel already exists with active agent",
      });
    }

    const agent = await createAgent(
      userId,
      AgentPlatform.OPENAI,
      channelType,
      finalChannelId
    );

    await agent.init();

    activeAgents.set(agentKey, agent);

    res.json({
      channelId: finalChannelId,
      channelType,
      message: "Channel created and AI agent initialized",
    });
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ error: "Failed to create channel" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
