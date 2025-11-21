const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get("/login", (req, res) => {
  res.render("users/login");
});
router.post("/register", async (req, res) => {
  const { email, password, deviceId } = req.body;
  const user = new User({ email, deviceId });
  const registered_user = await User.register(user, password);
  console.log(registered_user);
  res.redirect("/dashboard");
});

module.exports = router;
