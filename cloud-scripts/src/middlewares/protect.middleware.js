const protect = async (req, res, next) => {
  const bearer = req.header('Authorization');
  if (!bearer || !bearer.startsWith('Bearer ')) {
    console.error('No bearer token provided');
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = bearer.substring(bearer.indexOf(' ') + 1);
  if (!token) {
    console.error('No token provided');
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (token !== process.env.AUTH_TOKEN) {
    console.error('Invalid token provided');
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
};

module.exports = protect;
