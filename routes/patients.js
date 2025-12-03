const express = require("express");
const router = express.Router();
const Device = require("../models/device");
const Patient = require("../models/patient");
const Physician = require("../models/physician");
const catchAsync = require("../utils/catchAsync");
const {
  isLoggedIn,
  isDeviceOwner,
  validateDevice,
  isPatient,
} = require("../middleware");

router.use(isLoggedIn, isPatient);

// Show all the devices
router.get(
  "/dashboard",
  catchAsync(async (req, res) => {
    const userDeviceIds = req.user.devices;
    const patient_devices = await Device.find({ _id: { $in: userDeviceIds } });
    res.render("patient/dashboard", {
      patient_devices,
      page_css: null,
      page_script: null,
      title: "Dashboard",
    });
  })
);

// Creating/Adding a new device
router.get("/device/new", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/new_device", {
    device,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});

router.post(
  "/dashboard",
  validateDevice,
  catchAsync(async (req, res) => {
    // Saving the new device
    const device = new Device(req.body.device);
    await device.save();
    // link new device iD to the logged-in patient
    req.user.devices.push(device._id);
    await req.user.save();
    req.flash("success", "A new Device was added Successfully");
    res.redirect(`/patient/device/${device._id}`);
  })
);

// Edit/Update the info present on device
router.get(
  "/device/:id/edit",
  isDeviceOwner,
  catchAsync(async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device) {
      req.flash("error", "Cannot find that Device!");
      return res.redirect("/patient/dashboard");
    }
    res.render("patient/edit", { device });
  })
);
router.get(
  "/device/:id",
  catchAsync(async (req, res) => {
    const device = await Device.findById(req.params.id);
    if (!device) {
      req.flash("error", "Cannot find that Device!");
      return res.redirect("/patient/dashboard");
    }
    res.render("patient/show_device", {
      device,
      page_css: null,
      page_script: null,
      title: "About Us",
    });
  })
);
router.put(
  "/device/:id",
  isDeviceOwner,
  validateDevice,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const device = await Device.findByIdAndUpdate(id, {
      ...req.body.device,
    });
    req.flash("success", "Successfully Updated device Info");
    res.redirect(`/patient/device/${device._id}`);
  })
);

// Delete a particular device
router.delete(
  "/device/:id",
  isDeviceOwner,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    await Device.findByIdAndDelete(id);
    await req.user.updateOne({ $pull: { devices: id } });
    req.flash("success", "Successfully deleted the device");
    res.redirect("/patient/dashboard");
  })
);

// choose a physician
router.post("/choose-physician/:physicianId", isLoggedIn, async (req, res) => {
  const { physicianId } = req.params;
  const patientId = req.user._id;

  try {
    // Update the Patient Document
    const patient = await Patient.findByIdAndUpdate(
      patientId,
      // Set the reference to the chosen physician
      { assignedPhysician: physicianId }
    );

    // Update the Physician Document
    const physician = await Physician.findById(physicianId);

    if (!physician) {
      req.flash("error", "Physician not found.");
      return res.redirect("/physicians");
    }

    // Check if the patient is already in the array to prevent duplicates
    if (!physician.patients.includes(patientId)) {
      physician.patients.push(patientId);
      await physician.save();
    }

    req.flash(
      "success",
      `You have chosen Dr. ${physician.name.split(" ")[1]} as your Physician!`
    );
    res.redirect("/patient/dashboard");
  } catch (e) {
    req.flash("error", "An error occurred while assigning the physician.");
    res.redirect("/physicians");
  }
});

module.exports = router;
