import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Registration from '../src/models/Registration.js';
import Event from '../src/models/Event.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({
    $or: [
      { name: { $regex: 'yuna|yashasvi', $options: 'i' } },
      { email: { $regex: 'yuna|yashasvi', $options: 'i' } }
    ]
  }).lean();
  console.log('Matching users:', JSON.stringify(users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role })), null, 2));

  const regs = await Registration.find({
    $or: [
      { participantName: { $regex: 'yuna|yashasvi', $options: 'i' } },
      { email: { $regex: 'yuna|yashasvi', $options: 'i' } }
    ]
  }).populate('event', 'title date').lean();
  console.log('Matching registrations:', JSON.stringify(regs.map(r => ({
    id: r._id,
    participantName: r.participantName,
    email: r.email,
    event: r.event,
    student: r.student,
    ref: r.registrationReference
  })), null, 2));

  await mongoose.disconnect();
}
check();
