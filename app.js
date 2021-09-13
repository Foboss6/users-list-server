import express from 'express';
import knex from 'knex';
import cors from 'cors';
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
app.use(cors());
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
  const {email, password, firstname, lastname, position} = req.body;
  
  // validation of received data
  if(!(email && password)) return res.status(400).json("invalid admins data");
  
  if(!(email && emailValidation(email))) return res.status(400).json("invalid email");
  if(password.length < 6) return res.status(400).json("invalid password");
  
  // verify user's data, if at least one exists we'll work with it
  if(firstname || lastname || position) {
    if(firstname.length < 2) return res.status(400).json("invalid first name");
    if(lastname.length < 2) return res.status(400).json("invalid last name");
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
          firstname: firstname,
          lastname: lastname,
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
const {firstname, lastname, position} = req.body;
// validation of received data
if(firstname && lastname && position) {
  if(firstname.length < 2) return res.status(400).json("invalid first name");
  if(lastname.length < 2) return res.status(400).json("invalid last name");
  if(position.length < 2) return res.status(400).json("invalid position");
// all data is good, check the existence of such user
  db('users').select('*')
  .where({
    firstname: firstname,
    lastname: lastname,
    position: position
  })
  .then((data) => {
    if(data[0].id) return res.status(400).json('Such user already exists');
  })
  .catch((err) => { 
    // if such user doesn't exist, add him to the base
    db('users')
    .returning('*')
    .insert({
      firstname: firstname,
      lastname: lastname,
      position: position
    })
    .then(data => res.status(200).json(data[0]))
    .catch(err => res.status(400).json('Users database error, cannot add data'));
  });

} else res.status(400).json("invalid user's data");
});
// *************************************************

// ******* /users/delete ***************************
app.delete('/users/delete', (req, res) =>{
  const {id} = req.body;
  // validation of received data
  if(id) {
  // if id is good, check the existence of such user
    db('users').select('*')
    .where({
      id: id
    })
    .then((user) => {
      if(user[0].id) {
        // if the user exists, check if he is an admin too
        if(user[0].email) {
          // if such admin exists, delete him from the dabase
          db('admins').select('*')
          .where({email: user[0].email})
          .then((admin) => {
            if(admin[0].id) {
              db('admins')
              .where({id: admin[0].id})
              .del()
              .catch(err => res.status(400).json('1: Admins database error, cannot delete data'))
            }
          })
          .catch(console.log);
        }
        // delete the user from the database
        db('users')
        .where({id: user[0].id})
        .del()
        .then(() => res.status(200).json('success'))
        .catch(err => res.status(400).json('Users database error, cannot delete data'))
      }
    })
    .catch((err) =>  res.status(400).json('Such user does not exists'));
    // if requsted data are wrong
  } else res.status(400).json("invalid user's data");
});
// *************************************************

// ******* /users/:id *********************************
app.put('/users/:id', (req, res) => {
  const {firstname, lastname, position} = req.body;
  
  // validation of received data
  if(firstname && lastname && position) {
    if(firstname.length < 2) return res.status(400).json("invalid first name");
    if(lastname.length < 2) return res.status(400).json("invalid last name");
    if(position.length < 2) return res.status(400).json("invalid position");
    // all data is good, check the existence of such user
    if(req.params.id) {
      db('users')
      .where({id: req.params.id})
      .select('*')
      .then((user) => {
        if(user[0].id) {
          // if the user exists, update his data in the database
          db('users')
          .where({id: req.params.id})
          .update({
            firstname: firstname,
            lastname: lastname,
            position: position
          })
          .then(() => res.status(200).json('success, user\'s data updated'))
          .catch(err => res.status(400).json('Users database error: cannot undate data'))
        }
      })
      .catch(err => res.status(400).json('Such user does not exist'));
    } else res.status(400).json('invalid :id parameter');
  } else res.status(400).json('invalid user\'s data');
});
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