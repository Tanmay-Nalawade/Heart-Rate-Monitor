const { deviceSchema } = require("./validate_schema");
const ExpressError = require("./utils/ExpressError");
const Patient = require("./models/patient");
const Physician = require("./models/physician");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be signed in first!");
    return res.redirect("/login");
  }
  next();
};

// to save the returnTo value from the session (req.session.returnTo) to res.locals
module.exports.storeReturnTo = (req, res, next) => {
  if (req.session.returnTo) {
    res.locals.returnTo = req.session.returnTo;
  }
  next();
};

module.exports.isDeviceOwner = async (req, res, next) => {
  const { id } = req.params;
  const isOwner = req.user.devices.some((deviceId) => deviceId.equals(id));
  if (!isOwner) {
    req.flash("error", "You do not have permission to access this device!");
    return res.redirect("/patient/dashboard");
  }
  next();
};

// Device validation
module.exports.validateDevice = (req, res, next) => {
  const { error } = deviceSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

// Check if he is a user
module.exports.isPatient = (req, res, next) => {
  // Check if the user is authenticated AND is an instance of the Patient model
  if (req.isAuthenticated() && req.user instanceof Patient) {
    return next();
  }
  req.flash(
    "error",
    "You must be logged in as a patient to access this dashboard."
  );
  return res.redirect("/login");
};

// check if the user is Physician
module.exports.isPhysician = (req, res, next) => {
  // Check if the user is authenticated AND is an instance of the Physician model
  if (req.isAuthenticated() && req.user instanceof Physician) {
    return next();
  }
  req.flash(
    "error",
    "You must be logged in as a physician to access this dashboard."
  );
  return res.redirect("/login");
};
