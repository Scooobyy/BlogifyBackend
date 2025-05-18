const jwt = require('jsonwebtoken');
const JWT_SECRET = 'Pranavisagoodboi';


const fetchuser = (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).send({ error: 'Access denied: No token provided' });
  }

  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data.user;
    next();
  } catch (err) {
    res.status(401).send({ error: 'Access denied: Invalid token' });
  }
};

module.exports = fetchuser;
