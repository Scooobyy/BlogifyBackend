const express = require('express');
const connectToMongo = require('./db');
const cors = require('cors');
require('dotenv').config();
const blogRoutes = require('./routes/blogs');
connectToMongo();
const app = express();
const port = process.env.PORT || 5000;


// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // frontend URL
  credentials: true // if you're using cookies, optional for JWT
}));
app.use(express.json());

// Routes

app.use('/api/blogs', blogRoutes);

app.use('/uploads', express.static('uploads'));


app.use('/api/auth', require('./routes/auth'));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});
