import express from 'express';
import knex from 'knex';
import bcrypt from 'bcryptjs';

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

// ******* BCRYPT section **************************
// generate a random salt
const genSalt = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) {
        reject(err);
      } else {
        resolve({
          salt: salt,
          password: password
        });
      }
    });
  });
}

// generate hash for the password
const genHash = (salt, password) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, salt, function(err, hash) {
      if (err) {
        reject(err);
      } else {
        resolve({
          salt: salt,
          password: password,
          hash: hash
        });
      }
    });
  });
}
// *************************************************

const app = express();

// ****** MIDDLEWARE *******************************
app.use(express.json());
// *************************************************

// ******* /users **********************************
app.get('/users', (req, res) => {
  db('users').select('*')
  .then((data) => {
    if(data) {
      res.status(200).json(data);
    } else {
      res.status(404).json('Database is empty');
    }
  })
  .catch((err) => res.status(400).json(err));
})
// *************************************************

// ******* /login **********************************
app.post('/login', (req, res) => {
  const { loginEmail, loginPassword } = req.body;

  db.select('email', 'hash').from('admins').where('email', '=', loginEmail)
  .then((data) => {
    if(data) {
      if(bcrypt.compareSync(loginPassword, data[0].hash)) {
        db.select('*').from('users').where('email', '=', loginEmail)
        .then((data) => {
          if(data) {
            res.status(200).json(data[0]);
          } else res.status(400).json('Error in getting data from users database');
        })
      } else res.status(404).json('Wrong passwor');
    } else res.status(400).json('Error in getting data from database');
  })
  .catch(err => res.status(404).json('No such admin'));
});
// *************************************************

// ******* register **********************************

// *************************************************


// ******* /users **********************************

// *************************************************

app.get('/', (req, res) => {
  db('users').join('admins', 'users.email', 'admins.email').select('*')
  .then(data => res.status(200).json(data))
  .catch(err => res.status(400).json('Error in getting data from database'));
})

app.listen(PORT, () => {
  console.log(`Server is running`);
});