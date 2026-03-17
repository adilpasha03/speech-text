require("dotenv").config()

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const multer = require("multer")
const fs = require("fs")
const axios = require("axios")

const Audio = require("./models/Audio")

const app = express()

// Middleware
app.use(cors({
  origin: "https://speech-text-web.netlify.app"
}))

app.use(express.json())

// Serve uploaded audio files
app.use("/uploads", express.static("uploads"))

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err))


// Test route
app.get("/", (req, res) => {
  res.send("Backend server is running successfully")
})


// Multer storage setup
const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, "uploads/")
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname)
  }

})

const upload = multer({ storage })


// Upload API (Speech → Text)
app.post("/upload", upload.single("audio"), async (req, res) => {

  try {

    const audioPath = `uploads/${req.file.filename}`

    const audioBuffer = fs.readFileSync(audioPath)

    const response = await axios.post(
      "https://api.deepgram.com/v1/listen",
      audioBuffer,
      {
        headers: {
          Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
          "Content-Type": req.file.mimetype
        }
      }
    )

    const transcriptionText =
      response.data.results.channels[0].alternatives[0].transcript


    // Save to MongoDB
    const newAudio = new Audio({

      filename: req.file.filename,

      filepath: `/uploads/${req.file.filename}`,

      transcription: transcriptionText

    })

    await newAudio.save()


    res.json({
      transcription: transcriptionText
    })

  } catch (error) {

    console.log("Deepgram Error:", error.response?.data || error.message)

    res.status(500).json({
      error: "Speech to text failed"
    })

  }

})


// Get History API
app.get("/history", async (req, res) => {

  try {

    const history = await Audio.find().sort({ createdAt: -1 })

    res.json(history)

  } catch (error) {

    console.log(error)

    res.status(500).json({
      error: "Failed to fetch history"
    })

  }

})


// Delete History API
app.delete("/delete/:id", async (req, res) => {

  try {

    await Audio.findByIdAndDelete(req.params.id)

    res.json({
      message: "Deleted successfully"
    })

  } catch (error) {

    console.log(error)

    res.status(500).json({
      error: "Delete failed"
    })

  }

})


// Server start
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});