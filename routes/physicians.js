const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync");
const { isLoggedIn, isDeviceOwner, validateDevice } = require("../middleware");

module.exports = router;
