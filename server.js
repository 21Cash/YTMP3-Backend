const express = require("express");
const { dlAudio } = require("youtube-exec");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Define a route to handle the audio conversion and download
app.get("/convert", async (req, res) => {
  try {
    const link = req.query.url;
    const filePath = await downloadAudio(link);
    sendAudioFile(res, filePath);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Error processing request");
  }
});

// Define a route that returns "Hello World" HTML
app.get("/test", (req, res) => {
  res.send("<h1>Hello World!</h1>");
});

function sendAudioFile(res, filePath) {
  const fileStream = fs.createReadStream(filePath);

  const timeout = setTimeout(() => {
    console.error("Sending file timed out");
    fileStream.destroy();
    res.status(500).send("Sending file timed out");
  }, 60000);

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

  fileStream.pipe(res);

  fileStream.on("close", () => {
    clearTimeout(timeout);
    console.log("Audio file sent successfully!");
    deleteFile(filePath);
    res.end();
  });

  fileStream.on("error", (err) => {
    clearTimeout(timeout);
    console.error("Error sending file:", err.message);
    res.status(500).send("Error sending file");
  });

  res.on("finish", () => {
    console.log("Response sent successfully!");
  });
}

function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    console.log("File deleted successfully!");
  } catch (err) {
    console.error("Error deleting file:", err.message);
  }
}

async function downloadAudio(link) {
  try {
    const downloadPath = path.join(__dirname, "downloads");
    await dlAudio({
      url: link,
      folder: downloadPath,
      quality: "best",
    });
    console.log("Audio downloaded successfully! 🔊🎉");

    const files = fs.readdirSync(downloadPath);
    const filePath = path.join(downloadPath, files[0]);

    return filePath;
  } catch (err) {
    console.error("An error occurred:", err.message);
    throw err;
  }
}

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
