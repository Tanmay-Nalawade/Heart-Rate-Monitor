// models/reading.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const readingSchema = new Schema(
  {
    deviceHardwareId: {
      type: String,
      required: true,
      index: true, // helpful for queries by device
    },
    heartRate: {
      type: Number,
      required: true,
      min: 0,
    },
    spo2: {
      type: Number,
      min: 0,
      max: 100,
    },
    raw: {
      type: Schema.Types.Mixed, // for any extra sensor data blob
    },
    readingTime: {
      type: Date,
      default: Date.now, // either device time or server time
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

module.exports = mongoose.model("Reading", readingSchema);
