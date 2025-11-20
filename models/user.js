const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  devices: [
    {
      type: Schema.Types.ObjectId,
      ref: "Device",
    },
  ],
});

UserSchema.plugin(passportLocalMongoose, {
  usernameField: "email", // email becomes the username
  errorMessages: {
    UserExistsError: "A user with that email already exists.",
  },
});

module.exports = mongoose.model("User", UserSchema);
