const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://0.0.0.0:27017/authentication', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true }
});

const PokemonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);
const Pokemon = mongoose.model('Pokemon', PokemonSchema);

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email already registered' });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const user = new User({ email, password: hashedPassword });
  await user.save();
  res.json({ message: 'User registered successfully' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ message: 'Invalid email or password' });
  }
  const token = jwt.sign({ email }, 'secret-key');
  res.json({ token });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, 'secret-key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};


// Endpoint to get a single pokemon by ID
app.get('/pokemon/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const pokemon = await Pokemon.findById(id);
  console.log("hlo", pokemon);
  if (!pokemon) {
    return res.status(404).json({ message: 'Pokemon not found' });
  }
  res.json(pokemon);
});

// Endpoint to get list of pokemon
app.get('/pokemon', verifyToken, async (req, res) => {
  const pokemon = await Pokemon.find();
  res.json(pokemon);
});

// Endpoint to create a new pokemon
app.post('/pokemon', verifyToken, async (req, res) => {
  const { name, type } = req.body;
  const pokemon = new Pokemon({ name, type });
  await pokemon.save();
  res.json(pokemon);
});

app.listen(3000, () => console.log('Server started on port 3000'));
