const express = require("express");
const router = express.Router();
const Device = require("../models/device");

router.get("/dashboard", async (req, res) => {
  const patient_devices = await Device.find({});
  res.render("patient/dashboard", {
    patient_devices,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});

router.get("/device/new", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/new_device", {
    device,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});

router.post("/dashboard", async (req, res) => {
  const device = new Device(req.body.device);
  await device.save();
  res.redirect(`/patient/device/${device._id}`);
});

router.get("/device/:id/edit", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/edit", { device });
});

router.get("/device/:id", async (req, res) => {
  const device = await Device.findById(req.params.id);
  res.render("patient/show_device", {
    device,
    page_css: null,
    page_script: null,
    title: "About Us",
  });
});

router.put("/device/:id", async (req, res) => {
  const { id } = req.params;
  const device = await Device.findByIdAndUpdate(id, {
    ...req.body.device,
  });
  res.redirect(`/patient/device/${device._id}`);
});

router.delete("/device/:id", async (req, res) => {
  const { id } = req.params;
  await Device.findByIdAndDelete(id);
  res.redirect("/patient/dashboard");
});

module.exports = router;
