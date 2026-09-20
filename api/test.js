require('dotenv').config();
const { Telegraf } = require('telegraf');
const connectDB = require('../src/config/db');
const { sendRemindersToAll } = require('../src/services/reminderService');

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = async (req, res) => {
    try {
        await connectDB();
        
        const users = await require('../src/models/TelegramUser').find({ isConnected: true });
        console.log('کاربران متصل:', users.length);
        
        const r0 = await sendRemindersToAll(bot, 0);
        const r1 = await sendRemindersToAll(bot, 1);
        const r2 = await sendRemindersToAll(bot, 2);
        
        return res.json({
            ok: true,
            connectedUsers: users.map(u => ({
                telegramId: u.telegramId,
                reminderEnabled: u.reminderEnabled,
                isConnected: u.isConnected
            })),
            results: {
                today: r0,
                tomorrow: r1,
                twoDays: r2
            }
        });
    } catch (err) {
        return res.status(500).json({ error: err.message, stack: err.stack });
    }
};
