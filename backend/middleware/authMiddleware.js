const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user; // Attach user payload to request
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = verifyToken;
