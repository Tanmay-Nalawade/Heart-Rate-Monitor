const Joi = require("joi");

// Define the Device data validation rules
module.exports.deviceSchema = Joi.object({
  // The top-level key should match the object you expect in req.body
  device: Joi.object({
    // The default value is handled by Mongoose, but we ensure it's provided
    name: Joi.string().trim().required().messages({
      "any.required": "Device name is required.",
    }),
    // We validate type and requirement here; the 'unique' constraint is handled by Mongoose.
    serial_number: Joi.string().trim().required().messages({
      "any.required": "Serial number is required.",
    }),
    // Optional field, must be a number greater than 0
    last_reading_bpm: Joi.number()
      .allow(null) // Allows null if the field is omitted or explicitly set to null
      .min(0)
      .optional(),
    // Optional field, must be a valid date object or string that can be parsed as a date
    last_reading_recorded: Joi.date().allow(null).optional(),
    // Optional field, must be a number greater than 0
    reading_freq: Joi.number().allow(null).min(0).optional(),
  }).required(),
});

module.exports.physicianProfileSchema = Joi.object({
  // Full Name: Required, string, ensure it's not just whitespace
  name: Joi.string().trim().min(3).max(100).required().messages({
    "string.empty": "Full Name is required.",
    "string.min": "Name must be at least 3 characters long.",
  }),

  // Location: Required, string
  location: Joi.string().trim().min(5).max(100).required().messages({
    "string.empty": "Location (City, State) is required.",
    "string.min": "Location must be descriptive (e.g., City, State).",
  }),

  // Description/Bio: Required, string, ensures substantial content
  description: Joi.string().trim().min(20).max(500).required().messages({
    "string.empty": "A professional bio/description is required.",
    "string.min": "The description must be at least 20 characters long.",
  }),

  // Image URL: Optional, but if provided, must be a valid URL
  image: Joi.string()
    .allow("") // Allows the field to be empty (user keeps default image)
    .uri() // If value exists, it must be a valid URL format
    .messages({
      "string.uri":
        "Profile Image URL must be a valid link (starting with http:// or https://).",
    }),
});
