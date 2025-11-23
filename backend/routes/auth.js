const express = require("express");
const authRouter = express.Router();
const User = require("../models/User.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const JWT_EXPIRES_IN = "5h";

//signup
authRouter.post("/signup", async (req, res) => {
  console.log(req.body);
  const { email, userName, password } = req.body;

  if (!email || !userName || !password) {
    return res.status(400).json({ error: "All fields required" });
  }
  if (password.lenght < 6) {
    return res.status(400).json({ error: "Password must be 6+ chars" });
  }
  try {
    //check email
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ error: "Email already in use" });
    }
    //check username
    const userNameExists = await User.findOne({ userName });
    if (userNameExists) {
      return res.status(400).json({ error: "Username taken" });
    }
    //hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      userName,
      passwordHash,
    });

    const token = jwt.sign(
      {
        userid: user._id,
        userName: user.userName,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        userName: user.userName,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//login
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email" });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return res.status(400).json({ error: "Incorrect password" });
    }
    const token = jwt.sign(
      {
        userid: user._id,
        userName: user.userName,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        userName: user.userName,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// verify token (frontend uses this on refresh)
authRouter.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: "Invaild token" });
  }
});

module.exports = authRouter;
