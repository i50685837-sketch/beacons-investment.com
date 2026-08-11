const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required"
    });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.AUTH_SECRET
    );

    req.user = decoded;
    next();

  } catch {
    res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

module.exports = auth;
