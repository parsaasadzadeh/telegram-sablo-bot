const TelegramUser = require('../models/TelegramUser');
const { getUpcomingInstallments } = require('./authService');

const formatAmount = (amount) => Number(amount).toLocaleString('fa-IR') + ' تومان';

const formatDate = (dateStr) => {
    if (!dateStr) return 'نامشخص';
    return new Date(dateStr).toLocaleDateString('fa-IR');
};

const daysUntilDue = (dueDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    return Math.round((due - today) / (1000 * 60 * 60 * 24));
};

const buildReminderMessage = (installment, daysLeft) => {
    let urgencyIcon = '📅';
    let urgencyText = '';

    if (daysLeft === 0) {
        urgencyIcon = '⏰';
        urgencyText = '‼️ *امروز* موعد پرداخت است!';
    } else if (daysLeft === 1) {
        urgencyIcon = '⚠️';
        urgencyText = '⚠️ *فردا* موعد پرداخت است!';
    } else if (daysLeft === 2) {
        urgencyIcon = '🔔';
        urgencyText = `🔔 *${daysLeft} روز دیگر* موعد پرداخت است.`;
    }

    return (
        `${urgencyIcon} *یادآوری قسط*\n\n` +
        `📌 *عنوان:* ${installment.title}\n` +
        `💰 *مبلغ:* ${formatAmount(installment.amount)}\n` +
        `📆 *سررسید:* ${formatDate(installment.dueDate)}\n\n` +
        `${urgencyText}`
    );
};

const sendRemindersToAll = async (bot, targetDaysOffset) => {
    const result = { checked: 0, sent: 0, failed: 0, skipped: 0 };

    const users = await TelegramUser.find({ isConnected: true, reminderEnabled: true });
    console.log(`👥 تعداد کاربران فعال: ${users.length}`);

    for (const user of users) {
        result.checked++;

        const { success, installments, unauthorized } = await getUpcomingInstallments(user.sabloToken);

        if (!success) {
            if (unauthorized) {
                await TelegramUser.findByIdAndUpdate(user._id, { isConnected: false, sabloToken: null });
                try {
                    await bot.telegram.sendMessage(
                        user.telegramId,
                        '⚠️ اتصال حساب سابلو شما قطع شده است.\nلطفاً دوباره با /start وارد شوید.'
                    );
                } catch (_) {}
            }
            result.skipped++;
            continue;
        }

        const targetInstallments = installments.filter(inst => {
            if (!inst.dueDate) return false;
            return daysUntilDue(inst.dueDate) === targetDaysOffset;
        });

        for (const installment of targetInstallments) {
            const daysLeft = daysUntilDue(installment.dueDate);
            const message = buildReminderMessage(installment, daysLeft);

            try {
                await bot.telegram.sendMessage(user.telegramId, message, { parse_mode: 'Markdown' });
                result.sent++;
                console.log(`✅ یادآوری ارسال شد به ${user.telegramId} برای: ${installment.title}`);
            } catch (error) {
                result.failed++;
                console.error(`❌ خطا در ارسال به ${user.telegramId}:`, error.message);
            }
        }
    }

    return result;
};

module.exports = { sendRemindersToAll, formatAmount, formatDate, daysUntilDue };