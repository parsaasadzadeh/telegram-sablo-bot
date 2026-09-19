const TelegramUser = require('../models/TelegramUser');
const { sendOtp, verifyOtp } = require('../services/authService');

const mainMenuKeyboard = {
    keyboard: [
        ['📋 اقساط من', '💰 خلاصه مالی'],
        ['🔔 وضعیت یادآوری', '❌ قطع اتصال'],
    ],
    resize_keyboard: true,
    persistent: true,
};

const cancelKeyboard = {
    keyboard: [['❌ انصراف']],
    resize_keyboard: true,
};

const handleStart = async (ctx) => {
    const telegramId = ctx.from.id;
    const telegramName = ctx.from.first_name || '';
    const telegramUsername = ctx.from.username || '';

    let user = await TelegramUser.findOne({ telegramId });
    if (!user) {
        user = await TelegramUser.create({ telegramId, telegramName, telegramUsername });
    }

    if (user.isConnected) {
        await ctx.reply(
            `سلام ${telegramName} عزیز! 👋\n\nحساب سابلو شما متصل است ✅\nاز منوی زیر استفاده کنید:`,
            { reply_markup: mainMenuKeyboard }
        );
        return;
    }

    await TelegramUser.findByIdAndUpdate(user._id, { conversationState: 'WAITING_PHONE' });

    await ctx.reply(
        `سلام ${telegramName} عزیز! 👋\n\nبه ربات یادآوری اقساط *سابلو* خوش آمدید 🎉\n\nشماره موبایل حساب سابلو خود را وارد کنید:\n_(مثال: 09123456789)_`,
        { parse_mode: 'Markdown', reply_markup: cancelKeyboard }
    );
};

const handleLoginFlow = async (ctx) => {
    const telegramId = ctx.from.id;
    const text = ctx.message.text?.trim();

    const user = await TelegramUser.findOne({ telegramId });
    if (!user) return false;
    if (!user.conversationState) return false;

    // انصراف
    if (text === '❌ انصراف') {
        await TelegramUser.findByIdAndUpdate(user._id, {
            conversationState: null,
            pendingPhone: null,
        });
        await ctx.reply('عملیات لغو شد.\nبرای شروع مجدد /start بزنید.', {
            reply_markup: { remove_keyboard: true },
        });
        return true;
    }

    // انتظار شماره موبایل
    if (user.conversationState === 'WAITING_PHONE') {
        const phoneRegex = /^(0?9[0-9]{9})$/;
        if (!phoneRegex.test(text)) {
            await ctx.reply(
                '❌ شماره موبایل نامعتبر است.\nلطفاً یک شماره ایرانی معتبر وارد کنید:\n_(مثال: 09123456789)_',
                { parse_mode: 'Markdown', reply_markup: cancelKeyboard }
            );
            return true;
        }

        const phone = text.startsWith('0') ? text : '0' + text;
        await ctx.reply('⏳ در حال ارسال کد تایید...');

        const result = await sendOtp(phone);

        if (!result.success) {
            await ctx.reply(`❌ ${result.message}\n\nدوباره شماره موبایل را وارد کنید:`, {
                reply_markup: cancelKeyboard,
            });
            return true;
        }

        await TelegramUser.findByIdAndUpdate(user._id, {
            conversationState: 'WAITING_OTP',
            pendingPhone: phone,
        });

        await ctx.reply(
            `✅ کد تایید به شماره *${phone}* ارسال شد.\n\nکد ۵ رقمی را وارد کنید:`,
            { parse_mode: 'Markdown', reply_markup: cancelKeyboard }
        );
        return true;
    }

    // انتظار OTP
    if (user.conversationState === 'WAITING_OTP') {
        const otpRegex = /^[0-9]{4,6}$/;
        if (!otpRegex.test(text)) {
            await ctx.reply('❌ کد وارد شده نامعتبر است.\nلطفاً کد عددی ارسال‌شده را وارد کنید:', {
                reply_markup: cancelKeyboard,
            });
            return true;
        }

        await ctx.reply('⏳ در حال بررسی کد...');

        const result = await verifyOtp(user.pendingPhone, text);

        if (!result.success) {
            await ctx.reply(`❌ ${result.message}\n\nدوباره کد را وارد کنید یا انصراف دهید:`, {
                reply_markup: cancelKeyboard,
            });
            return true;
        }

        await TelegramUser.findByIdAndUpdate(user._id, {
            sabloToken: result.token,
            sabloUserId: result.user?._id || result.user?.id || null,
            isConnected: true,
            conversationState: null,
            pendingPhone: null,
        });

        await ctx.reply(
            `🎉 *اتصال برقرار شد!*\n\nحساب سابلو شما با موفقیت متصل شد.\nاز این پس یادآوری اقساط را در تلگرام دریافت خواهید کرد. 🔔`,
            { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard }
        );
        return true;
    }

    return false;
};

module.exports = { handleStart, handleLoginFlow, mainMenuKeyboard };