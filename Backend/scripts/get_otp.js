// scripts/get_otp.js
// Usage: node scripts/get_otp.js e2e_test@example.com
require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/get_otp.js <email>');
  process.exit(2);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email }).lean();
    if (!user) {
      console.log('User not found:', email);
      process.exit(0);
    }
    console.log('User id:', user._id?.toString?.() || user._id);
    console.log('email:', user.email);
    console.log('otp:', user.otp);
    console.log('otpExpires:', user.otpExpires);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error reading OTP:', err);
    process.exit(1);
  }
})();
