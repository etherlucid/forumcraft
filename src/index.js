import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import http from 'node:http';
import { handleInteraction } from './handlers/interactionHandler.js';
import { handleThreadCreate } from './handlers/forumAutoHandler.js';

dotenv.config();

// HTTP server port listener for free web service hosting tiers (Render, Koyeb)
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ForumCraft Bot OK');
}).listen(port);

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Error: DISCORD_TOKEN is missing in your .env file');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, (c) => {
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${c.user.id}&permissions=292095696896&scope=bot%20applications.commands`;
  console.log(`------------------------------------------------------------------`);
  console.log(`ForumCraft online (@${c.user.username})`);
  console.log(`Invite link: ${inviteUrl}`);
  console.log(`------------------------------------------------------------------`);
});

client.on(Events.InteractionCreate, (interaction) => {
  handleInteraction(interaction);
});

client.on(Events.ThreadCreate, (thread, isNew) => {
  if (isNew) {
    handleThreadCreate(thread);
  }
});

client.login(token);
