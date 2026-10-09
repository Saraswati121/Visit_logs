const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDb = require('../database/db');
const Questionnaire = require('../model/questionnaireModel');
const User = require('../model/userModel');
const School = require('../model/schoolModel');
const Visit = require('../model/visitModel');

const DEMO_USERS = [
  {
    userId: 'U1001',
    userName: 'Asha Patra',
    role: 'Cluster coordinator'
  },
  {
    userId: 'U1002',
    userName: 'Ramesh Nayak',
    role: 'Cluster coordinator'
  },
  {
    userId: 'U1003',
    userName: 'Sunita Das',
    role: 'Block officer'
  }
];

async function seed() {
  await connectDb();

  console.log('Ensuring database indexes...');
  await Promise.all([
    School.init(),
    Questionnaire.init(),
    User.init(),
    Visit.init()
  ]);

  console.log('Seeding demo users...');
  let usersInserted = 0;
  let usersUpdated = 0;

  for (const user of DEMO_USERS) {
    const res = await User.updateOne(
      { userId: user.userId },
      { $set: user },
      { upsert: true }
    );
    if (res.upsertedCount > 0) usersInserted++;
    else if (res.modifiedCount > 0) usersUpdated++;
  }
  console.log(`Users seeded: ${usersInserted} inserted, ${usersUpdated} updated (Total: ${DEMO_USERS.length})`);

  let qPath = path.join(__dirname, '../../data/questionnaires.json');
  if (!fs.existsSync(qPath)) {
    qPath = 'C:\\Users\\saraswati.panda\\Downloads\\questionnaires.json';
  }

  if (fs.existsSync(qPath)) {
    console.log(`Seeding questionnaires from ${qPath}...`);
    const qData = JSON.parse(fs.readFileSync(qPath, 'utf-8'));
    let qInserted = 0;
    let qUpdated = 0;

    for (const item of qData) {
      const res = await Questionnaire.updateOne(
        { year: item.year, month: item.month },
        { $set: item },
        { upsert: true }
      );
      if (res.upsertedCount > 0) qInserted++;
      else if (res.modifiedCount > 0) qUpdated++;
    }
    console.log(`Questionnaires seeded: ${qInserted} inserted, ${qUpdated} updated (Total: ${qData.length})`);
  } else {
    console.warn(`Questionnaires file not found at ${qPath}`);
  }

  await mongoose.disconnect();
  console.log('Seeding completed successfully without duplicates.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
