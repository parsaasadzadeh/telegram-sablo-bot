require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
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
const app = express();
app.use(express.json());

// هندلرهای ربات
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

// health check
app.get('/', (req, res) => {
    res.json({ ok: true, service: 'Sablo Telegram Bot' });
});

// webhook تلگرام
app.post('/webhook', (req, res) => {
    bot.handleUpdate(req.body, res);
});

// کرون Vercel
app.get('/cron/remind', async (req, res) => {
    const auth = req.headers['authorization'];
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        await connectDB();
        const [r0, r1, r2] = await Promise.all([
            sendRemindersToAll(bot, 0),
            sendRemindersToAll(bot, 1),
            sendRemindersToAll(bot, 2),
        ]);
        res.json({ ok: true, today: r0, tomorrow: r1, twoDays: r2 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

connectDB();
const WEBHOOK_URL = `https://${process.env.VERCEL_URL}/webhook`;
bot.telegram.setWebhook(WEBHOOK_URL).then(() => {
    console.log('✅ Webhook set:', WEBHOOK_URL);
}).catch(console.error);

module.exports = app;
