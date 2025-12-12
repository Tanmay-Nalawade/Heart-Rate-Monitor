const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/patient");
const Physician = require("../models/physician");
const Device = require("../models/device");
const { storeReturnTo } = require("../middleware");

// Determines which Passport strategy (Patient or Physician) to use
// based on the 'role' selected in the login form.
const authenticateUserOrPhysician = (req, res, next) => {
  // 1. Check for the selected role from the Login form
  const role = req.body.role;

  if (role === "physician") {
    // Authenticate against the Physician model using the physician-specific strategy
    passport.authenticate("physician-local", {
      failureRedirect: "/login",
    })(req, res, next);
  } else {
    // Default to patient (role === 'patient') or any other role, using the patient-specific strategy
    passport.authenticate("patient-local", {
      failureRedirect: "/login",
    })(req, res, next);
  }
};

router.get("/login", (req, res) => {
  res.render("users/login", {
    page_css: "login.css", // Pass the name of the stylesheet file
    page_script: "login.js",
    title: "Login/Register",
  });
});

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, role, serialNumber, licenseId } = req.body;

    // User object to upload
    let userDetails = { email };
    // To hold either patient or physician model
    let RegisterModel;
    // For redirection
    let registeredRole;

    if (role === "patient") {
      // for patient use deviceId (optional)
      userDetails.devices = [];
      if (serialNumber && serialNumber.trim()) {
        const newDevice = new Device({
          serial_number: serialNumber,
        });
        await newDevice.save();
        userDetails.devices = [newDevice._id];
      }
      RegisterModel = User;
      registeredRole = "patient";
    } else if (role === "physician") {
      // for Physician, require licenseId
      if (!licenseId || !licenseId.trim()) {
        req.flash("error", "Medical License ID is required for physicians.");
        return res.redirect("/login");
      }
      userDetails.licenseId = licenseId.trim();
      RegisterModel = Physician;
      registeredRole = "physician";
    }
    const user = new RegisterModel(userDetails);
    const registered_patient = await RegisterModel.register(user, password);
    req.login(registered_patient, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome!");
      const dest = registeredRole === "physician" ? "/physician/dashboard" : "/patient/dashboard";
      res.redirect(dest);
    });
  } catch (err) {
    req.flash("error", err.message || "Registration failed");
    res.redirect("/login");
  }
});

router.post(
  "/login",
  authenticateUserOrPhysician,
  storeReturnTo,
  // passport.authenticate logs the user in and clears req.session
  (req, res) => {
    req.flash("success", "Welcome back!");
    const role = req.body.role;
    const defaultDashboard =
      role === "physician" ? "/physician/dashboard" : "/patient/dashboard";
    const redirectUrl = res.locals.returnTo || defaultDashboard;
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  }
);

router.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success", "Goodbye!");
    res.redirect("/");
  });
});

module.exports = router;
