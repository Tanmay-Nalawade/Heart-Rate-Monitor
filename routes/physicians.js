const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware");
const Physician = require("../models/physician");
const Patient = require("../models/patient");
const Reading = require("../models/reading");

// Physician dashboard: list all patients (simple, no assignment yet)
router.get(
  "/dashboard",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const patients = await Patient.find({}).select("email");
      res.render("physician/dashboard", {
        title: "Physician Dashboard",
        page_css: null,
        page_script: null,
        patients,
      });
    } catch (err) {
      next(err);
    }
  }
);

// View readings for a specific patient (no assignment check yet)
router.get(
  "/patients/:id/readings",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const patient = await Patient.findById(id);
      if (!patient) {
        req.flash("error", "Patient not found.");
        return res.redirect("/physician/dashboard");
      }

      const rawReadings = await Reading.find({ patient: id })
        .sort({ readingTime: 1 })
        .limit(300)
        .lean();

      const readings = rawReadings.map((r) => ({
        heartRate: Number(r.heartRate),
        spo2: Number(r.spo2),
        readingTime: r.readingTime,
      }));

      res.render("physician/patient_readings", {
        title: `Readings for ${patient.email}`,
        page_css: null,
        page_script: null,
        patient,
        readings,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
