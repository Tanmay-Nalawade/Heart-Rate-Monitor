const { deviceSchema, physicianProfileSchema } = require("./validate_schema");
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

// To check if the curr user is a device owner
module.exports.isDeviceOwner = async (req, res, next) => {
  const { id } = req.params;
  const isOwner = req.user.devices.some((deviceId) => deviceId.equals(id));
  if (!isOwner) {
    req.flash("error", "You do not have permission to access this device!");
    return res.redirect("/patient/dashboard");
  }
  next();
};

// to check if the current user is assigned a particular physician
module.exports.isAssignedPhysician = async (req, res, next) => {
  const { physicianId } = req.params;

  const patient = await Patient.findById(req.user._id);

  if (!patient) {
    req.flash("error", "Patient profile not found.");
    return res.redirect("/login");
  }

  // 2. Check if the physicianId is included in the patient's assignedPhysicians array.
  // Use .some() with .equals() for safe MongoDB ObjectId comparison,
  // similar to how you checked for device ownership.
  const isAssigned = patient.assignedPhysicians.some((assignedId) =>
    assignedId.equals(physicianId)
  );

  if (!isAssigned) {
    req.flash(
      "error",
      "You are not assigned to this physician and cannot view this information."
    );
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

// To validate if either device owner or the assignedPhysician
module.exports.canViewDeviceData = async (req, res, next) => {
  const { id } = req.params; // Assumes URL is like /devices/:id

  // 1. Find the Patient who owns this device
  // Since Device doesn't have an owner field, we look for the Patient
  // whose 'devices' array contains this Device ID.
  const patientOwner = await Patient.findOne({ devices: id });

  if (!patientOwner) {
    req.flash("error", "Device is not linked to any patient.");
    // Redirect based on role to avoid dead ends
    const redirectUrl =
      req.user.role === "physician"
        ? "/physician/dashboard"
        : "/patient/dashboard";
    return res.redirect(redirectUrl);
  }

  // 2. CHECK: Is the current user the Patient who owns the device?
  if (req.user.role === "patient" && patientOwner._id.equals(req.user._id)) {
    return next();
  }

  // 3. CHECK: Is the current user a Physician assigned to this Patient?
  if (req.user.role === "physician") {
    const isAssigned = patientOwner.assignedPhysicians.some((physicianId) =>
      physicianId.equals(req.user._id)
    );

    if (isAssigned) {
      return next();
    }
  }

  // 4. Deny Access
  req.flash(
    "error",
    "You do not have permission to view data for this device."
  );
  return res.redirect(
    req.user.role === "physician"
      ? "/physician/dashboard"
      : "/patient/dashboard"
  );
};

// Middleware to validate the physician profile completion data
module.exports.validatePhysicianProfile = (req, res, next) => {
  // We only need the validation function from the schema object
  const { error } = physicianProfileSchema.validate(req.body);
  if (error) {
    // Concatenate all detailed error messages into one string
    const msg = error.details.map((el) => el.message).join(", ");
    req.flash("error", msg);
    return res.redirect("/physician/complete-profile");
  }
  next();
};
