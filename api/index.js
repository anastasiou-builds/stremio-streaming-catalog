const serverless = require("serverless-http")
const { app } = require("../addon")

module.exports = serverless(app)
