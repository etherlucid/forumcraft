import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'data/forum_posts.json');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const init = { posts: {}, config: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data || '{}');
    return {
      posts: parsed.posts || {},
      config: parsed.config || {}
    };
  } catch (err) {
    console.error('Error reading database file:', err);
    return { posts: {}, config: {} };
  }
}

function saveDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

export const db = {
  getPost(threadId) {
    const dbData = loadDB();
    return dbData.posts[threadId] || null;
  },

  savePost(threadId, postData) {
    const dbData = loadDB();
    dbData.posts[threadId] = {
      ...dbData.posts[threadId],
      ...postData,
      updatedAt: new Date().toISOString()
    };
    saveDB(dbData);
    return dbData.posts[threadId];
  },

  deletePost(threadId) {
    const dbData = loadDB();
    delete dbData.posts[threadId];
    saveDB(dbData);
  },

  getConfig(guildId) {
    const dbData = loadDB();
    return dbData.config[guildId] || {
      editorRoleId: null,
      bypassRoleId: null,
      autoConvertEnabled: true
    };
  },

  saveConfig(guildId, configData) {
    const dbData = loadDB();
    dbData.config[guildId] = {
      ...dbData.config[guildId],
      ...configData
    };
    saveDB(dbData);
    return dbData.config[guildId];
  }
};
