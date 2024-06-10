const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();


const serviceAccount = require('./myproject-e88c8-firebase-adminsdk-gqefm-af9f2a49f7.json'); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();


app.set('view engine', 'ejs');


app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const saltRounds = 10;

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    
    const existingUser = await db.collection('users').where('email', '==', email).get();

    if (!existingUser.empty) {
      return res.status(400).send('Email already exists');
    }

  
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    
    await db.collection('users').add({
      email,
      password: hashedPassword, 
    });

    
    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    
    const userQuery = await db.collection('users').where('email', '==', email).get();

    if (userQuery.empty) {
      return res.status(401).send('Invalid email or password');
    }

    const userData = userQuery.docs[0].data();
    const hashedPassword = userData.password;

    
    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (passwordMatch) {
      res.redirect('/dashboard');
    } else {
      res.status(401).send('Invalid email or password');
    }
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

app.get('/dashboard', async (req, res) => {
  try {
    const searchTerm = req.query.q || '';

    if (searchTerm) {
      
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(searchTerm)}`);
      const data = await response.json();

    
      if (response.status !== 200 || !data.length) {
        return res.render('dashboard', { word: searchTerm, definitions: [] });
      }

      const definitions = data[0].meanings.flatMap(meaning => meaning.definitions);

      
      res.render('dashboard', { word: searchTerm, definitions });
    } else {
     
      res.render('dashboard', { word: '', definitions: [] });
    }
  } catch (error) {
    console.error('Error fetching word definitions:', error);
    res.status(500).send('Error fetching word definitions');
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
