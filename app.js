import express from 'express';
import knex from 'knex';
import { HOST_NAME, PORT } from './variables.js';

// ****** DATABASE section *************************
// Its for fix poblem with using free Heroku database 
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  }
});
// *************************************************

const app = express();

// ****** MIDDLEWARE *******************************
app.use(express.json());
// *************************************************

app.get('/', (req, res) => {
  res.status(200).json('All working');
})

app.listen(PORT, HOST_NAME, () => {
  console.log(`Server running at http://${HOST_NAME}:${PORT}/`);
});