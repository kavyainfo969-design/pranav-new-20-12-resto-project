require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function run(){
  const uri = process.env.MONGO_URI;
  if(!uri){
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }
  try{
    await mongoose.connect(uri);
    const users = await User.find().select('name email phone verified role').lean();
    console.log(`Found ${users.length} users\n`);
    users.forEach(u => {
      console.log(`- ${u.name} | ${u.email} | ${u.phone} | verified:${u.verified} | role:${u.role || 'customer'}`);
    });
    await mongoose.disconnect();
    process.exit(0);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
}

run();
