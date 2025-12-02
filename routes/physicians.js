const express = require("express");
const router = express.Router();
const Patient = require("../models/patient");
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn, isPhysician } = require("../middleware");

router.use(isLoggedIn, isPhysician);

router.get(
  "/dashboard",
  catchAsync(async (req, res) => {
    const patientIds = req.user.patients;
    const data = await Patient.find({ _id: { $in: patientIds } });
    res.render("patient/dashboard", {
      data,
      page_css: null,
      page_script: null,
      title: "Dashboard",
    });
  })
);
module.exports = router;
