const db = require("../db");

const userSchema = new db.Schema({

});

const User = db.model("User", userSchema);
module.exports = User;

