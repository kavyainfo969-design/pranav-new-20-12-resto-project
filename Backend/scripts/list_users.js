require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function listUsers(){
  const uri = process.env.MONGO_URI;
  if(!uri){
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }
  try{
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const users = await User.find().lean();
    console.log(JSON.stringify(users, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  }catch(err){
    console.error('Error fetching users:', err);
    process.exit(1);
  }
}

listUsers();
