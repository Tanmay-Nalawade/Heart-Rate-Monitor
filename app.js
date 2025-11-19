const express = require("express");
const app = express();
const path = require("path");

const Physician = require("./models/physician");
const User = require("./models/user");

require("./models/physician");

// Telling express to use ejs as the templating engine
app.set("view engine", "ejs");
// Setting the directory for ejs templates
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/test-physician", async (req, res) => {
  try {
    const physician = new Physician({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "12345",
      patients: [], // empty for now
    });

    await physician.save();
    res.send("Physician saved!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving physician");
  }
});

app.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Basic validation
    if (!firstName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password,
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/index", (req, res) => {
  res.render("index");
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
