import fs from 'fs';
import path from 'path';

interface ChannelConfig {
  name: string;
  handle: string;
  channelId: string;
}

async function resolveChannels() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("YOUTUBE_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const configPath = path.join(process.cwd(), 'config', 'jordan_channels.json');
  if (!fs.existsSync(configPath)) {
    console.error("config/jordan_channels.json file not found.");
    process.exit(1);
  }

  const channels: ChannelConfig[] = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log(`Resolving ${channels.length} channel handles...`);

  let updatedCount = 0;
  for (const item of channels) {
    if (item.channelId) {
      console.log(`Skipping ${item.name} (${item.handle}) - channelId already set: ${item.channelId}`);
      continue;
    }

    const handleClean = item.handle.startsWith('@') ? item.handle : `@${item.handle}`;
    const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handleClean)}&key=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        item.channelId = data.items[0].id;
        updatedCount++;
        console.log(`Resolved ${item.name} (${item.handle}) -> ${item.channelId}`);
      } else {
        console.warn(`Could not resolve handle ${handleClean} for ${item.name}`);
      }
    } catch (err) {
      console.error(`Failed to resolve handle ${handleClean}:`, err);
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(channels, null, 2), 'utf-8');
  console.log(`Successfully resolved and updated ${updatedCount} channels in config/jordan_channels.json`);
}

resolveChannels().catch(console.error);
