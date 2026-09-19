const cron = require('node-cron');
const { sendRemindersToAll } = require('../services/reminderService');

const startCronJobs = (bot) => {
    // هر روز ساعت ۸ صبح — اقساط امروز
    cron.schedule('0 8 * * *', async () => {
        console.log('⏳ [کرون] ارسال یادآوری اقساط امروز...');
        try {
            const result = await sendRemindersToAll(bot, 0);
            console.log(`✅ [کرون] امروز: ${result.sent} ارسال شد | ${result.failed} ناموفق | ${result.skipped} رد شد`);
        } catch (err) {
            console.error('❌ [کرون] خطا در یادآوری امروز:', err.message);
        }
    }, { timezone: 'Asia/Tehran' });

    // هر روز ساعت ۸ صبح — اقساط فردا
    cron.schedule('0 8 * * *', async () => {
        console.log('⏳ [کرون] ارسال یادآوری اقساط فردا...');
        try {
            const result = await sendRemindersToAll(bot, 1);
            console.log(`✅ [کرون] فردا: ${result.sent} ارسال شد | ${result.failed} ناموفق | ${result.skipped} رد شد`);
        } catch (err) {
            console.error('❌ [کرون] خطا در یادآوری فردا:', err.message);
        }
    }, { timezone: 'Asia/Tehran' });

    // هر روز ساعت ۸ صبح — اقساط ۲ روز دیگر
    cron.schedule('0 8 * * *', async () => {
        console.log('⏳ [کرون] ارسال یادآوری اقساط ۲ روز دیگر...');
        try {
            const result = await sendRemindersToAll(bot, 2);
            console.log(`✅ [کرون] ۲ روز دیگر: ${result.sent} ارسال شد | ${result.failed} ناموفق | ${result.skipped} رد شد`);
        } catch (err) {
            console.error('❌ [کرون] خطا در یادآوری ۲ روز دیگر:', err.message);
        }
    }, { timezone: 'Asia/Tehran' });

    console.log('✅ کرون جاب‌های یادآوری تلگرام شروع شدند');
};

module.exports = startCronJobs;