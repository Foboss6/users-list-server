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

// ******* register ********************************
const emailValidation = (email) => (
  /^\w+([-]?\w+)*@\w+([-]?\w+)*(\.\w{2,3})+$/.test(email)
  ? true
  : false
);

app.post('/login/register', (req, res) => {
  const {email, password, firstName, lastName, position} = req.body;
  
  // validation of received data
  if(!(email && password)) return res.status(400).json("invalid admins data");
  
  if(!(email && emailValidation(email))) return res.status(400).json("invalid email");
  if(password.length < 6) return res.status(400).json("invalid password");
  
  // verify user's data, if at least one exists we'll work with it
  if(firstName || lastName || position) {
    if(firstName.length < 2) return res.status(400).json("invalid first name");
    if(lastName.length < 2) return res.status(400).json("invalid last name");
    if(position.length < 2) return res.status(400).json("invalid position");
  
    // all data is good, store it into database

    // generating hash for new admins's password
    genSalt(password)
    .then((result) => {
      return genHash(result.salt, result.password);
    })
    .then((result) => {
      // store new admin's password into database
      db('admins').insert({
        hash: result.hash,
        email: email.toLowerCase(),
      })
      .then(() => {
        // store new user's data into database
        db('users')
        .returning('*')
        .insert({
          firstname: firstName,
          lastname: lastName,
          position: position,
          email: email.toLowerCase()
        })
        .then(data => res.status(200).json(data[0]))
        .catch(err => res.status(400).json('Users database error, cannot add data'));
      })
      .catch((err) => {
        if(err.detail && err.detail.includes('exist')) {
          return res.status(400).json('Admin with this email already exists');
        } else {
          return res.status(400).json('2: Admins database error, cannot add data');
        }
      })  
    })
    .catch(err => res.status(400).json("server error"));
  } else {

    // if we receive only email an password, then add it into admins databasse
    // without adding user into users database 
    // generating hash for new admins's password
    genSalt(password)
    .then((result) => {
      return genHash(result.salt, result.password);
    })
    .then((result) => {
      // store new admin's password into database
      db('admins')
      .returning('*')
      .insert({
        hash: result.hash,
        email: email.toLowerCase(),
      })
      .then(data => res.status(200).json({id: data[0].id, email: data[0].email}))
      .catch((err) => {
        if(err.detail && err.detail.includes('exist')) {
          return res.status(400).json('Admin with this email already exists');
        } else {
          return res.status(400).json('1: Admins database error, cannot add data');
        }
      });
    })
    .catch(err => res.status(400).json("server error"));
  }
});
// *************************************************


// ******* /users/create ***************************
app.post('/users/create', (req, res) => {
const {firstName, lastName, position} = req.body;

if(firstName && lastName && position) {
  if(firstName.length < 2) return res.status(400).json("invalid first name");
  if(lastName.length < 2) return res.status(400).json("invalid last name");
  if(position.length < 2) return res.status(400).json("invalid position");

  db('users').select('*')
  .where({
    firstname: firstName,
    lastname: lastName,
    position: position
  })
  .then((data) => { return res.status(400).json(data)})
  .catch((err) => { return res.status(400).json(err[0])});

  // db('users')
  //     .returning('*')
  //     .insert({
  //       firstname: firstName,
  //       lastname: lastName,
  //       position: position
  //     })
  //     .then(data => res.status(200).json(data[0]))
  //     .catch(err => res.status(400).json('Users database error, cannot add data'));

} else res.status(400).json("invalid user's data");
});
// *************************************************

// ******* /users **********************************

// *************************************************

app.get('/', (req, res) => {
  let packageToSend = [];
  db('users').select('*')
  .then(data => packageToSend.push(data))
  .then(() => {
    
    db('admins').select('*')
    .then(data => packageToSend.push(data))
    .then(() => {
      
      res.status(200).json(packageToSend);
    })
    .catch(err => res.status(400).json('Error in getting data from admins database'));
  })
  .catch(err => res.status(400).json('Error in getting data from users database'));
});

app.listen(PORT, () => {
  console.log(`Server is running`);
});