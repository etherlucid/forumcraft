# ForumCraft

A Discord bot for collaborative forum posts. Discord natively restricts post editing to the original author and locks post preview thumbnails. ForumCraft maintains bot-owned starter messages so post text, tags, and cover images can be updated by post creators, designated editors, or admins.

## Features

- **Dynamic Forum Thumbnails**: Updating the post cover image updates the starter message embed, changing the main Discord forum grid preview thumbnail.
- **Image Updating**: Upload an image file directly into the thread or enter an image URL link.
- **Simple Role Controls**: Admins and post authors can edit posts by default. Option to set a dedicated Editor Role for community helpers, or a Bypass Role for un-converted posts.
- **Creation Panel & Commands**: Create posts via slash commands or a pinned button panel. Native member posts can also auto-convert automatically.

## Commands

| Command | Description |
| :--- | :--- |
| `/forum panel forum_channel:#forum [target_channel:#channel]` | Posts a creation button card in any text channel. |
| `/forum create channel:#forum title:... [description:...] [image_url:...] [image_file:...]` | Creates a post directly with optional image URL or file upload. |
| `/forum text [title:...] [description:...]` | Updates title and text of the current post. |
| `/forum image [url:...] [file:...]` | Updates cover image and main forum preview thumbnail. |
| `/forum tags` | Opens tag selection dropdown menu. |
| `/forum config [editor_role:@Role] [bypass_role:@Role] [auto_convert:true/false]` | Configures Editor Role, Bypass Role, and Auto-Convert settings. |

## Setup

### Environment Variables
Create a `.env` file in the project root:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_server_id_optional
```

### Commands
```bash
npm install
npm run deploy
npm start
```

### Hosting
Includes `Dockerfile` and `render.yaml` for deployment on Render, Docker, Railway, or Fly.io.
