require('dotenv').config();
const { Telegraf } = require('telegraf');
const connectDB = require('../src/config/db');

const { handleStart, handleLoginFlow } = require('../src/handlers/startHandler');
const {
    handleMyInstallments,
    handleFinanceSummary,
    handleReminderToggle,
    handleDisconnect,
} = require('../src/handlers/menuHandler');
const { sendRemindersToAll } = require('../src/services/reminderService');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
    try { await handleStart(ctx); } catch (err) { console.error(err.message); }
});

bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;
    try {
        const handled = await handleLoginFlow(ctx);
        if (handled) return;
        switch (text) {
            case '📋 اقساط من':      await handleMyInstallments(ctx); break;
            case '💰 خلاصه مالی':    await handleFinanceSummary(ctx); break;
            case '🔔 وضعیت یادآوری': await handleReminderToggle(ctx); break;
            case '❌ قطع اتصال':      await handleDisconnect(ctx); break;
        }
    } catch (err) {
        console.error(err.message);
        try { await ctx.reply('❌ خطایی رخ داد.'); } catch (_) {}
    }
});

// اتصال دیتابیس — یک بار در طول عمر instance
let dbReady = false;
const ensureDB = async () => {
    if (!dbReady) {
        await connectDB();
        dbReady = true;
    }
};

module.exports = async (req, res) => {
    await ensureDB();

    const path = req.url.split('?')[0];

    if (req.method === 'GET' && path === '/') {
        return res.json({ ok: true, service: 'Sablo Telegram Bot' });
    }

    if (req.method === 'POST' && path === '/webhook') {
        try {
            await bot.handleUpdate(req.body);
            return res.json({ ok: true });
        } catch (err) {
            console.error('webhook error:', err.message);
            return res.status(500).json({ error: err.message });
        }
    }

    if (req.method === 'GET' && path === '/cron/remind') {
        const auth = req.headers['authorization'];
        if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            const [r0, r1, r2] = await Promise.all([
                sendRemindersToAll(bot, 0),
                sendRemindersToAll(bot, 1),
                sendRemindersToAll(bot, 2),
            ]);
            return res.json({ ok: true, today: r0, tomorrow: r1, twoDays: r2 });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(404).json({ error: 'Not found' });
};
