const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn, isPhysician } = require("../middleware");

module.exports = router;

router.use(isLoggedIn, isPhysician);
