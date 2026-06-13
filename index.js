const { app } = require("./addon")

const PORT = process.env.PORT || 7000

app.listen(PORT, () => {
  console.log(`Addon running at http://localhost:${PORT}/manifest.json`)
})
