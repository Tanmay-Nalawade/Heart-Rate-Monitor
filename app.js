const express = require("express");
const session = require("express-session");
const path = require("path");
const app = express();

const User = require("./models/Users");
// Initialize MongoDB connection (configured in ./db)
require("./db");

// ---------- Middleware ----------
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("➡️  Incoming request:", req.method, req.url);
  next();
});

// Sessions
app.use(
  session({
    secret: "replace_this_with_a_better_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 // 1 hour
    }
  })
);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static("public"));

// ---------- Auth middleware ----------
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// (Optional) make username available in all views
// so you can show "Logged in as ..." in header if you want
app.use((req, res, next) => {
  res.locals.currentUser = req.session?.username || null;
  next();
});

// ---------- Routes ----------

// Home
app.get("/", (req, res) => {
  res.render("home");
});

// Login form
app.get("/login", (req, res) => {
  res.render("login");
});

// Handle login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1) Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send("Invalid username or password");
      // later: res.render("login", { error: "Invalid username or password" });
    }

    // 2) Check password using the comparePassword method from your model
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).send("Invalid username or password");
    }

    // 3) Save user info in the session
    req.session.userId = user._id;
    req.session.username = user.username;

    // 4) Redirect to a protected page
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Server error during login");
  }
});

// Register form
app.get("/register", (req, res) => {
  res.render("register");
});

// Handle registration
app.post("/register", async (req, res) => {
  console.log("🔥🔥🔥 HIT POST /register 🔥🔥🔥");
  console.log("📥 POST /register body:", req.body);

  const { username, email, password } = req.body;

  try {
    const newUser = new User({ username, email, password });
    await newUser.save();
    console.log("✅ User saved:", newUser);

    // After registering, send user to login page
    res.redirect("/login");
  } catch (err) {
    console.error("❌ Error saving user:", err);
    res.status(500).send("Error creating user");
  }
});

// Protected dashboard
app.get("/dashboard", requireLogin, (req, res) => {
  res.render("dashboard", { username: req.session.username });
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out");
    }
    // Clear cookie just to be clean
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

// Debug route: list all users (probably not for production)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.render("users", { users });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).send("Error fetching users");
  }
});

app.listen(8080, () => {
  console.log("Serving on port 8080");
});
