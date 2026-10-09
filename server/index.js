const express = require('express');
const connectDb = require('./src/database/db');
const apiRoutes = require('./src/controller/questionnaries');
const cors = require(cors())

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors())

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('School Visit Log Backend Service is running!');
});

app.listen(PORT, async () => {
  await connectDb();
  console.log(`Server listening on port ${PORT}`);
});

module.exports = app;