const TelegramUser = require('../models/TelegramUser');
const { getUpcomingInstallments, getFinanceSummary } = require('../services/authService');
const { formatAmount, formatDate, daysUntilDue } = require('../services/reminderService');
const { mainMenuKeyboard } = require('./startHandler');

const notConnectedMsg = '⚠️ حساب سابلو شما متصل نیست.\nلطفاً با /start وارد شوید.';

const disconnectUser = async (userId) => {
    await TelegramUser.findByIdAndUpdate(userId, { isConnected: false, sabloToken: null });
};

const handleMyInstallments = async (ctx) => {
    const user = await TelegramUser.findOne({ telegramId: ctx.from.id });
    if (!user?.isConnected) { await ctx.reply(notConnectedMsg); return; }

    await ctx.reply('⏳ در حال دریافت اقساط...');

    const { success, installments, unauthorized, message } = await getUpcomingInstallments(user.sabloToken);

    if (!success) {
        if (unauthorized) {
            await disconnectUser(user._id);
            await ctx.reply('⚠️ نشست شما منقضی شده. لطفاً دوباره /start بزنید.');
        } else {
            await ctx.reply(`❌ ${message}`);
        }
        return;
    }

    if (installments.length === 0) {
        await ctx.reply('✅ هیچ قسط پرداخت‌نشده‌ای ندارید!', { reply_markup: mainMenuKeyboard });
        return;
    }

    installments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const toShow = installments.slice(0, 10);

    let text = `📋 *اقساط پرداخت‌نشده شما* (${installments.length} قسط)\n\n`;

    toShow.forEach((inst, index) => {
        const days = daysUntilDue(inst.dueDate);
        let dayLabel = '';
        if (days < 0)      dayLabel = `🔴 ${Math.abs(days)} روز گذشته`;
        else if (days === 0) dayLabel = '🔴 امروز';
        else if (days === 1) dayLabel = '🟠 فردا';
        else if (days <= 7)  dayLabel = `🟡 ${days} روز دیگر`;
        else                 dayLabel = `🟢 ${days} روز دیگر`;

        text +=
            `*${index + 1}.* ${inst.title}\n` +
            `   💰 ${formatAmount(inst.amount)}\n` +
            `   📆 ${formatDate(inst.dueDate)} — ${dayLabel}\n\n`;
    });

    if (installments.length > 10) text += `_و ${installments.length - 10} قسط دیگر..._`;

    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
};

const handleFinanceSummary = async (ctx) => {
    const user = await TelegramUser.findOne({ telegramId: ctx.from.id });
    if (!user?.isConnected) { await ctx.reply(notConnectedMsg); return; }

    await ctx.reply('⏳ در حال دریافت اطلاعات مالی...');

    const { success, summary, unauthorized, message } = await getFinanceSummary(user.sabloToken);

    if (!success) {
        if (unauthorized) {
            await disconnectUser(user._id);
            await ctx.reply('⚠️ نشست شما منقضی شده. لطفاً دوباره /start بزنید.');
        } else {
            await ctx.reply(`❌ ${message}`);
        }
        return;
    }

    const text =
        `💰 *خلاصه مالی سابلو*\n\n` +
        `📈 *درآمد کل:* ${formatAmount(summary.totalIncome)}\n` +
        `📉 *هزینه کل:* ${formatAmount(summary.totalExpense)}\n` +
        `🏦 *موجودی نقدی:* ${formatAmount(summary.cashBalance)}\n\n` +
        `📌 *بدهی فعال:* ${formatAmount(summary.activeDebt)}\n` +
        `🔢 *اقساط پرداخت‌نشده:* ${summary.unpaidInstallmentsCount} قسط\n` +
        `💳 *جمع اقساط باقیمانده:* ${formatAmount(summary.unpaidInstallmentsAmount)}`;

    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
};

const handleReminderToggle = async (ctx) => {
    const user = await TelegramUser.findOne({ telegramId: ctx.from.id });
    if (!user?.isConnected) { await ctx.reply(notConnectedMsg); return; }

    const newState = !user.reminderEnabled;
    await TelegramUser.findByIdAndUpdate(user._id, { reminderEnabled: newState });

    const stateText = newState ? '✅ *فعال*' : '❌ *غیرفعال*';
    const stateDesc = newState
        ? 'از این پس یادآوری اقساط را دریافت خواهید کرد.'
        : 'دیگر یادآوری دریافت نخواهید کرد.';

    await ctx.reply(`🔔 وضعیت یادآوری: ${stateText}\n\n${stateDesc}`, {
        parse_mode: 'Markdown',
        reply_markup: mainMenuKeyboard,
    });
};

const handleDisconnect = async (ctx) => {
    const user = await TelegramUser.findOne({ telegramId: ctx.from.id });
    if (!user?.isConnected) { await ctx.reply(notConnectedMsg); return; }

    await TelegramUser.findByIdAndUpdate(user._id, {
        sabloToken: null,
        sabloUserId: null,
        isConnected: false,
        conversationState: null,
        pendingPhone: null,
    });

    await ctx.reply('✅ حساب سابلو شما با موفقیت قطع شد.\n\nبرای اتصال مجدد /start بزنید.', {
        reply_markup: { remove_keyboard: true },
    });
};

module.exports = { handleMyInstallments, handleFinanceSummary, handleReminderToggle, handleDisconnect };