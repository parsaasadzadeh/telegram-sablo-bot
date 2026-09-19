require('dotenv').config();
const { Telegraf } = require('telegraf');
const connectDB = require('./config/db');

const { handleStart, handleLoginFlow } = require('./handlers/startHandler');
const {
    handleMyInstallments,
    handleFinanceSummary,
    handleReminderToggle,
    handleDisconnect,
} = require('./handlers/menuHandler');
const { sendRemindersToAll } = require('./services/reminderService');

const bot = new Telegraf(process.env.BOT_TOKEN);

// -------------------------------------------------------
// تعریف هندلرها (مشترک بین polling و webhook)
// -------------------------------------------------------
const setupHandlers = () => {
    bot.start(async (ctx) => {
        try { await handleStart(ctx); }
        catch (err) { console.error('❌ /start:', err.message); }
    });

    bot.on('text', async (ctx) => {
        const text = ctx.message.text.trim();
        if (text.startsWith('/')) return;
        try {
            const handledByLogin = await handleLoginFlow(ctx);
            if (handledByLogin) return;

            switch (text) {
                case '📋 اقساط من':       await handleMyInstallments(ctx); break;
                case '💰 خلاصه مالی':     await handleFinanceSummary(ctx); break;
                case '🔔 وضعیت یادآوری':  await handleReminderToggle(ctx); break;
                case '❌ قطع اتصال':       await handleDisconnect(ctx); break;
            }
        } catch (err) {
            console.error('❌ پیام:', err.message);
            try { await ctx.reply('❌ خطایی رخ داد. دوباره تلاش کنید.'); } catch (_) {}
        }
    });

    bot.catch((err) => console.error('❌ Bot error:', err.message));
};

// -------------------------------------------------------
// محیط Vercel — webhook + cron endpoint
// -------------------------------------------------------
if (process.env.VERCEL) {
    const express = require('express');
    const app = express();
    app.use(express.json());

    // health check
    app.get("/", (req, res) => res.json({ ok: true, service: "Sablo Telegram Bot" }));

    setupHandlers();

    // webhook تلگرام
    app.post('/webhook', (req, res) => {
        bot.handleUpdate(req.body, res);
    });

    // endpoint کرون Vercel (ساعت ۸ صبح به وقت ایران = ۴:۳۰ UTC)
    app.get('/cron/remind', async (req, res) => {
        // امنیت: فقط Vercel مجاز به صدا زدن این endpoint هست
        const authHeader = req.headers['authorization'];
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            await connectDB();
            console.log('⏳ [Vercel Cron] شروع ارسال یادآوری...');

            const [r0, r1, r2] = await Promise.all([
                sendRemindersToAll(bot, 0),
                sendRemindersToAll(bot, 1),
                sendRemindersToAll(bot, 2),
            ]);

            console.log(`✅ امروز: ${r0.sent} | فردا: ${r1.sent} | ۲ روز: ${r2.sent}`);
            res.json({ ok: true, today: r0, tomorrow: r1, twoDays: r2 });
        } catch (err) {
            console.error('❌ Cron error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // ست کردن webhook هنگام اولین درخواست
    const WEBHOOK_URL = `https://${process.env.VERCEL_URL}/webhook`;
    bot.telegram.setWebhook(WEBHOOK_URL).catch(console.error);

    module.exports = app;

// -------------------------------------------------------
// محیط لوکال — polling معمولی
// -------------------------------------------------------
} else {
    const startCronJobs = require('./cron/scheduler');

    connectDB();
    setupHandlers();
    startCronJobs(bot);
    bot.launch();

    console.log('🤖 ربات سابلو (polling) شروع به کار کرد...');

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    module.exports = bot;
}
