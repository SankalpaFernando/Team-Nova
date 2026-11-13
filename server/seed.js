require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Site = require('./models/Site');
const Device = require('./models/Device');
const SensorReading = require('./models/SensorReading');
const Alert = require('./models/Alert');

const connectDB = require('./config/db');

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ CRITICAL ERROR: seed.js execution is strictly prohibited in production.');
    process.exit(1);
  }

  await connectDB();

  console.log(' Seeding database...');

  // Clear existing data
  await Promise.all([
  Alert.deleteMany({}),
  SensorReading.deleteMany({}),
  Device.deleteMany({}),
  Site.deleteMany({}),
  User.deleteMany({})
]);

  // Create users
  const admin1 = await User.create({
    name: 'Admin One',
    email: 'admin1@mangrovewatch.com',
    password: 'admin123',
    role: 'admin',
    status: 'approved'
  });

  const admin2 = await User.create({
    name: 'Admin Two',
    email: 'admin2@mangrovewatch.com',
    password: 'admin123',
    role: 'admin',
    status: 'approved'
  });

  const user1 = await User.create({
    name: 'User One',
    email: 'user1@mangrovewatch.com',
    password: 'user123',
    role: 'registered_user',
    status: 'approved'
  });

  const user2 = await User.create({
    name: 'User Two',
    email: 'user2@mangrovewatch.com',
    password: 'user123',
    role: 'registered_user',
    status: 'approved'
  });

  console.log(' Users created');

  // Create sites
  const site1 = await Site.create({
    name: 'Negombo Lagoon North',
    location: '7.2081° N, 79.8461° E',
    region: 'Western',

    thresholds: {
    pH: { min: 6.5, max: 8.5 },
    temperature: { min: 20, max: 35 },
    salinity: { min: 0, max: 40 },
    dissolved_o2: { min: 5, max: 14 }
  },

    createdBy: admin1._id
  });

  const site2 = await Site.create({
    name: 'Muthurajawela Wetlands',
    location: '7.0878° N, 79.8858° E',
    region: 'Western',

    thresholds: {
    pH: { min: 6.5, max: 8.5 },
    temperature: { min: 20, max: 35 },
    salinity: { min: 0, max: 40 },
    dissolved_o2: { min: 5, max: 14 }
  },

    createdBy: admin1._id
  });

  const site3 = await Site.create({
    name: 'Puttalam Lagoon Site',
    location: '8.0362° N, 79.8428° E',
    region: 'Northern',

    thresholds: {
    pH: { min: 6.5, max: 8.5 },
    temperature: { min: 20, max: 35 },
    salinity: { min: 0, max: 40 },
    dissolved_o2: { min: 5, max: 14 }
  },

    createdBy: admin2._id
  });

  console.log(' Sites created');

  // Create devices
  const device1 = await Device.create({
    device_id: 'MGV-001',
    installation_date: new Date('2024-01-15'),
    status: 'active',
    site: site1._id
  });

  const device2 = await Device.create({
    device_id: 'MGV-002',
    installation_date: new Date('2024-02-20'),
    status: 'active',
    site: site2._id
  });

  const device3 = await Device.create({
    device_id: 'MGV-003',
    installation_date: new Date('2024-03-10'),
    status: 'maintenance',
    site: site3._id
  });
  const device4 = await Device.create({
    device_id: 'MGV-004',
    installation_date: new Date('2024-04-01'),
    status: 'active',
    site: site1._id
});

  // Link devices to sites
  await Site.findByIdAndUpdate(site1._id, { devices: [device1._id , device4._id] });
  await Site.findByIdAndUpdate(site2._id, { devices: [device2._id ,device4._id] });
  await Site.findByIdAndUpdate(site3._id, { devices: [device3._id , device4._id] });

  console.log(' Devices created');

  // Generate sample readings for the last 24 hours
  const readings = [];
  const now = Date.now();
  const oneHour = 3600000;

  for (let i = 24; i >= 0; i--) {
    const time = new Date(now - i * (oneHour / 2));
    const noise = () => (Math.random() - 0.5) * 0.4;

    readings.push({
      device: device1._id,
      recorded_at: time,
      pH: parseFloat((7.5 + noise()).toFixed(2)),
      temperature: parseFloat((28 + noise() * 3).toFixed(2)),
      salinity: parseFloat((25 + noise() * 5).toFixed(2)),
      dissolved_o2: parseFloat((8 + noise() * 2).toFixed(2))
    });

    readings.push({
      device: device2._id,
      recorded_at: time,
      pH: parseFloat((7.8 + noise()).toFixed(2)),
      temperature: parseFloat((27 + noise() * 3).toFixed(2)),
      salinity: parseFloat((30 + noise() * 4).toFixed(2)),
      dissolved_o2: parseFloat((7 + noise() * 2).toFixed(2))
    });
  }

  await SensorReading.insertMany(readings);
  console.log(` ${readings.length} sensor readings generated`);

  console.log('\n Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin1 : admin1@mangrovewatch.com / admin123');
console.log('Admin2 : admin2@mangrovewatch.com / admin123');
console.log('User1  : user1@mangrovewatch.com / user123');
console.log('User2  : user2@mangrovewatch.com / user123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(0);
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
