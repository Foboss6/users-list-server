import express from 'express';
import knex from 'knex';

const PORT = process.env.PORT;

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
  db.select('*').from('users')
  .then(data => res.status(200).json(data))
  .catch(err => res.status(400).json('Error in getting data from database'+));
})

app.listen(PORT, () => {
  console.log(`Server running at http://${HOST_NAME}:${PORT}/`);
});