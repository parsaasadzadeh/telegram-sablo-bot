const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB متصل شد');
    } catch (error) {
        console.error('❌ خطا در اتصال به MongoDB:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;