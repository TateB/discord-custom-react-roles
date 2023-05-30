import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config();

const TARGET_EMOJI = process.env.TARGET_EMOJI;
const TARGET_GUILD_ID = process.env.TARGET_GUILD_ID;
const TARGET_MESSAGE_ID = process.env.TARGET_MESSAGE_ID;
const TARGET_ROLE_ID = process.env.TARGET_ROLE_ID;
const MAX_JOIN_TIME = 1_000 * 60 * 2; // 2 minutes

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, () => {
  console.log("Ready");
});

client.on(Events.GuildCreate, async (guild) => {
  console.log("Joined guild:", guild.id);
  if (guild.id !== TARGET_GUILD_ID) {
    console.log("Leaving guild:", guild.id);
    await guild.leave();
  }
});

/**
 *
 * @param {import("discord.js").MessageReaction | import("discord.js").PartialMessageReaction} reaction
 * @param {import("discord.js").User | import("discord.js").PartialUser} user
 */
const getGuildAndMemberFromReaction = async (reaction, user) => {
  if (reaction.partial) {
    await reaction.fetch();
  }

  // ignore reactions on other messages
  if (reaction.message.id !== TARGET_MESSAGE_ID) return {};
  // ignore other emojis
  if (reaction.emoji.name !== TARGET_EMOJI) return {};

  const guild = await client.guilds.fetch(TARGET_GUILD_ID);
  const member = await guild.members.fetch(user.id);

  return { guild, member };
};

client.on(Events.MessageReactionAdd, (reaction, user) =>
  getGuildAndMemberFromReaction(reaction, user)
    .then(async ({ guild, member }) => {
      if (!guild || !member) return;

      // member already has the role, ignore reaction
      if (member.roles.cache.has(TARGET_ROLE_ID)) return;

      // member joined too long ago, kick them
      if (Date.now() - member.joinedTimestamp > MAX_JOIN_TIME) {
        console.log("Kicking member:", user.id);
        await member.kick("Did not react in time");
        return;
      }

      // add role
      console.log("Adding role to member:", user.id);
      await member.roles.add(TARGET_ROLE_ID);

      return;
    })
    .catch((e) => {
      console.error("MessageReactionAdd error:", e);
      return;
    })
);

client.login(process.env.CLIENT_TOKEN);
