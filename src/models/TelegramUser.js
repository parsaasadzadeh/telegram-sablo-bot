const mongoose = require('mongoose');

const telegramUserSchema = new mongoose.Schema(
    {
        // شناسه تلگرام کاربر
        telegramId: {
            type: Number,
            required: true,
            unique: true,
        },

        // نام نمایشی تلگرام
        telegramName: {
            type: String,
            default: '',
        },

        // یوزرنیم تلگرام
        telegramUsername: {
            type: String,
            default: '',
        },

        // توکن JWT از سابلو (بعد از لاگین)
        sabloToken: {
            type: String,
            default: null,
        },

        // شناسه کاربر در سابلو
        sabloUserId: {
            type: String,
            default: null,
        },

        // آیا حساب سابلو متصل شده؟
        isConnected: {
            type: Boolean,
            default: false,
        },

        // وضعیت فعلی مکالمه (برای مدیریت مراحل لاگین)
        // null | 'WAITING_PHONE' | 'WAITING_OTP'
        conversationState: {
            type: String,
            default: null,
        },

        // شماره موبایلی که OTP براش فرستادیم
        pendingPhone: {
            type: String,
            default: null,
        },

        // آیا یادآوری فعال است؟
        reminderEnabled: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('TelegramUser', telegramUserSchema);