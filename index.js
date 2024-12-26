
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

// Data storage setup
const DATA_PATH = path.join(__dirname, "data.json");
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ users: {} }));
}

function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function loadData() {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            saveData({ users: {} });
            return { users: {} };
        }
        const data = JSON.parse(fs.readFileSync(DATA_PATH));
        if (!data.users) {
            data.users = {};
            saveData(data);
        }
        return data;
    } catch (error) {
        console.error("Error loading data:", error);
        return { users: {} };
    }
}

// Constants for leveling system
const ZONES = {
    "Awakened Zone": { min: 0, max: 10 },
    "Essence Zone": { min: 11, max: 20 },
    "Master Zone": { min: 21, max: 30 },
    "Transcendence Zone": { min: 31, max: 40 },
    "Supreme Zone": { min: 41, max: 50 },
    "Sovereign Zone": { min: 51, max: 60 },
    "Celestial Zone": { min: 61, max: 70 },
    "Demi-God Zone": { min: 71, max: 80 },
    "God Zone": { min: 81, max: 90 },
    "Eternal Zone": { min: 91, max: 100 },
};

// Welcome message event
client.on("guildMemberAdd", async (member) => {
    const welcomeChannel = member.guild.channels.cache.find(
        (channel) => channel.name === "👋welcome",
    );
    if (!welcomeChannel) return;

    const welcomeEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Welcome to the Realm of Weaver")
        .setDescription(
            `Destiny weaves a new tale today—welcome to the Realm, ${member}!`,
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    welcomeChannel.send({ embeds: [welcomeEmbed] });
});

// Leveling system
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    try {
        const data = loadData();

        // Initialize the basic structure if it doesn't exist
        if (!data.users) {
            data.users = {};
        }

        const userId = message.author.id;
        const guildId = message.guild.id;

        // Initialize guild data if it doesn't exist
        if (!data.users[guildId]) {
            data.users[guildId] = {};
        }

        // Initialize user data if it doesn't exist
        if (!data.users[guildId][userId]) {
            data.users[guildId][userId] = {
                exp: 0,
                level: 1,
            };
        }

        // Add random exp between 15-25 for each message
        const expToAdd = Math.floor(Math.random() * 11) + 15;
        data.users[guildId][userId].exp += expToAdd;

        // Calculate level (exp needed = level * 100)
        const newLevel = Math.floor(data.users[guildId][userId].exp / 100) + 1;

        if (newLevel > data.users[guildId][userId].level) {
            data.users[guildId][userId].level = newLevel;
            const levelUpChannel = message.guild.channels.cache.find(
                (channel) => channel.name === "level-up",
            );

            if (levelUpChannel) {
                // Check for zone change
                const oldZone = getZone(newLevel - 1);
                const newZone = getZone(newLevel);

                if (oldZone !== newZone) {
                    // Zone change announcement
                    const zoneEmbed = new EmbedBuilder()
                        .setColor("#ff0000")
                        .setTitle("🌟 New Zone Achievement! 🌟")
                        .setDescription(
                            `${message.author} has ascended to the ${newZone}!`,
                        )
                        .setTimestamp();

                    levelUpChannel.send({ embeds: [zoneEmbed] });
                } else {
                    // Regular level up announcement
                    const levelEmbed = new EmbedBuilder()
                        .setColor("#00ff00")
                        .setTitle("Level Up!")
                        .setDescription(
                            `${message.author} has reached level ${newLevel}!`,
                        )
                        .setTimestamp();

                    levelUpChannel.send({ embeds: [levelEmbed] });
                }
            }
        }

        saveData(data);
    } catch (error) {
        console.error("Error in messageCreate event:", error);
    }
});

// Helper function to get zone based on level
function getZone(level) {
    for (const [zoneName, range] of Object.entries(ZONES)) {
        if (level >= range.min && level <= range.max) {
            return zoneName;
        }
    }
    return "Eternal Zone"; // Default for levels above 90
}

// Rank command
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "rank") {
        const data = loadData();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        if (!data.users[guildId] || !data.users[guildId][userId]) {
            return interaction.reply("You haven't earned any experience yet!");
        }

        const user = data.users[guildId][userId];
        const rankEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle(`${interaction.user.username}'s Rank`)
            .addFields(
                { name: "Level", value: user.level.toString() },
                { name: "Experience", value: user.exp.toString() },
                { name: "Zone", value: getZone(user.level) },
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        interaction.reply({ embeds: [rankEmbed] });
    }
});

// Leaderboard command
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === "leaderboard") {
        try {
            const data = loadData();
            const guildData = data.users[interaction.guild.id] || {};

            const sortedUsers = Object.entries(guildData)
                .map(([userId, userData]) => ({
                    userId,
                    ...userData,
                }))
                .sort((a, b) => b.exp - a.exp)
                .slice(0, 10);

            const leaderboardEmbed = new EmbedBuilder()
                .setColor("#0099ff")
                .setTitle("Top 10 Cultivators")
                .setTimestamp();

            for (let i = 0; i < sortedUsers.length; i++) {
                const user = await client.users.fetch(sortedUsers[i].userId);
                leaderboardEmbed.addFields({
                    name: `${i + 1}. ${user.username}`,
                    value: `Level: ${sortedUsers[i].level} | EXP: ${sortedUsers[i].exp} | Zone: ${getZone(sortedUsers[i].level)}`,
                    inline: false,
                });

                // Add user avatar as thumbnail for the first place
                if (i === 0) {
                    leaderboardEmbed.setThumbnail(
                        user.displayAvatarURL({ dynamic: true }),
                    );
                }
            }

            await interaction.reply({ embeds: [leaderboardEmbed] });
        } catch (error) {
            console.error("Error in leaderboard command:", error);
            await interaction.reply({
                content: "There was an error while generating the leaderboard.",
                ephemeral: true,
            });
        }
    }
});

// Admin commands for managing exp
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    if (
        interaction.commandName === "addexp" ||
        interaction.commandName === "removeexp"
    ) {
        if (!interaction.member.permissions.has("ADMINISTRATOR")) {
            return interaction.reply({
                content: "Only administrators can use this command!",
                ephemeral: true,
            });
        }

        const targetUser = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");
        const data = loadData();
        const guildId = interaction.guild.id;
        const userId = targetUser.id;

        if (!data.users[guildId]) {
            data.users[guildId] = {};
        }
        if (!data.users[guildId][userId]) {
            data.users[guildId][userId] = {
                exp: 0,
                level: 1,
            };
        }

        if (interaction.commandName === "addexp") {
            data.users[guildId][userId].exp += amount;
        } else {
            data.users[guildId][userId].exp = Math.max(
                0,
                data.users[guildId][userId].exp - amount,
            );
        }

        data.users[guildId][userId].level =
            Math.floor(data.users[guildId][userId].exp / 100) + 1;
        saveData(data);

        interaction.reply(
            `Successfully ${interaction.commandName === "addexp" ? "added" : "removed"} ${amount} exp ${interaction.commandName === "addexp" ? "to" : "from"} ${targetUser.username}`,
        );
    }
});

// Register slash commands
const commands = [
    {
        name: "rank",
        description: "Check your current rank and experience",
    },
    {
        name: "leaderboard",
        description: "View the top 10 cultivators",
    },
    {
        name: "addexp",
        description: "Add experience to a user (Admin only)",
        defaultMemberPermissions: "Administrator", // Only visible to admins
        options: [
            {
                name: "user",
                type: 6,
                description: "The user to add experience to",
                required: true,
            },
            {
                name: "amount",
                type: 4,
                description: "Amount of experience to add",
                required: true,
            },
        ],
    },
    {
        name: "removeexp",
        description: "Remove experience from a user (Admin only)",
        defaultMemberPermissions: "Administrator", // Only visible to admins
        options: [
            {
                name: "user",
                type: 6,
                description: "The user to remove experience from",
                required: true,
            },
            {
                name: "amount",
                type: 4,
                description: "Amount of experience to remove",
                required: true,
            },
        ],
    },
];

client.once("ready", async () => {
    console.log("Bot is ready!");
    await client.application.commands.set(commands);
});

// Login to Discord
const config = require("./config.json");
const token = process.env["TOKEN"] || "";

console.log("Checking token configuration...");
if (!token || token.length === 0) {
    console.error(
        "Token is missing or empty! Please check your Secrets configuration.",
    );
    process.exit(1);
}

client.login(token).catch((error) => {
    console.error("Failed to login:", error);
    console.error(
        "Please verify your token is correct and properly configured in Secrets.",
    );
    process.exit(1);
});
