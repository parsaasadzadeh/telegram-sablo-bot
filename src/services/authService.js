const axios = require('axios');

const BASE_URL = process.env.SABLO_API_URL;

// ارسال OTP به شماره موبایل
const sendOtp = async (phone) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/request-otp`, { phone });
        return { success: true, data: response.data };
    } catch (error) {
        const message = error.response?.data?.message || 'خطا در ارسال کد تایید';
        return { success: false, message };
    }
};

// تایید OTP و دریافت توکن
const verifyOtp = async (phone, code) => {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/verify-otp`, { phone, code });
        const { token, user } = response.data;
        return { success: true, token, user };
    } catch (error) {
        const message = error.response?.data?.message || 'کد تایید اشتباه است';
        return { success: false, message };
    }
};

// دریافت اقساط پرداخت‌نشده کاربر از سابلو
const getUpcomingInstallments = async (token) => {
    try {
        const response = await axios.get(`${BASE_URL}/api/finance/my-data`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { type: 'INSTALLMENT' },
        });

        const all = response.data.transactions || [];
        const unpaid = all.filter(tx => !tx.isPaid);
        return { success: true, installments: unpaid };
    } catch (error) {
        const message = error.response?.data?.message || 'خطا در دریافت اقساط';
        if (error.response?.status === 401) {
            return { success: false, unauthorized: true, message };
        }
        return { success: false, message };
    }
};

// دریافت خلاصه مالی کاربر
const getFinanceSummary = async (token) => {
    try {
        const response = await axios.get(`${BASE_URL}/api/finance/stats`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return { success: true, summary: response.data.summary };
    } catch (error) {
        const message = error.response?.data?.message || 'خطا در دریافت اطلاعات مالی';
        if (error.response?.status === 401) {
            return { success: false, unauthorized: true, message };
        }
        return { success: false, message };
    }
};

module.exports = { sendOtp, verifyOtp, getUpcomingInstallments, getFinanceSummary };