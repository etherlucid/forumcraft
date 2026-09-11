import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { commandData } from './commands/forum.js';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const rawGuildId = process.env.GUILD_ID?.trim();

if (!token || !clientId) {
  console.error('Error: DISCORD_TOKEN and CLIENT_ID must be set in your .env file');
  process.exit(1);
}

const isPlaceholderGuild = !rawGuildId || rawGuildId === '123456789012345678' || rawGuildId.includes('your_');
const guildId = isPlaceholderGuild ? null : rawGuildId;

const commands = [commandData.toJSON()];
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`Refreshing ${commands.length} application (/) commands...`);

    if (guildId) {
      try {
        await rest.put(Routes.applicationCommands(clientId), { body: [] }).catch(() => {});
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands }
        );
        console.log(`Registered commands to guild ${guildId}`);
      } catch (guildErr) {
        if (guildErr.code === 50001) {
          await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
          );
          console.log('Registered commands globally');
        } else {
          throw guildErr;
        }
      }
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log('Registered commands globally');
    }

    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
    console.log(`\nInvite link:\n${inviteUrl}\n`);
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
})();
