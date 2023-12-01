const express = require("express");
const { dlAudio } = require("youtube-exec");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const app = express();
const port = 3000;

// Define a route to handle the audio conversion and download
app.get("/convert", async (req, res) => {
  try {
    // Get the YouTube link from the request or read it from a file, as you prefer
    // const link = req.query.url || getLink();
    const link = req.query.url;

    // Use youtube-exec to download the audio
    const filePath = await downloadAudio(link);

    // Send the downloaded audio file as a response
    sendAudioFile(res, filePath);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Error processing request");
  }
});

function sendAudioFile(res, filePath) {
  const fileStream = fs.createReadStream(filePath);

  const timeout = setTimeout(() => {
    console.error("Sending file timed out");
    fileStream.destroy(); // Close the file stream
    res.status(500).send("Sending file timed out");
  }, 60000); // 60 seconds timeout

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", "attachment; filename=audio.mp3");

  fileStream.pipe(res);

  fileStream.on("close", () => {
    clearTimeout(timeout); // Clear the timeout when the file stream is closed
    console.log("Audio file sent successfully!");
    deleteFile(filePath); // Delete the file after sending
    res.end(); // Signal the end of the response
  });

  fileStream.on("error", (err) => {
    clearTimeout(timeout);
    console.error("Error sending file:", err.message);
    res.status(500).send("Error sending file");
  });

  res.on("finish", () => {
    // This event is emitted when the response has been sent
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

// function getLink() {
//   const link = fs.readFileSync("link.txt", "utf-8");
//   const lines = link.split(/\r?\n/);
//   const linkStr = lines[0];
//   return linkStr;
// }

async function downloadAudio(link) {
  try {
    const downloadPath = path.join(__dirname, "downloads"); // Set your desired download path
    await dlAudio({
      url: link,
      folder: downloadPath,
      // filename: "filename", // optional, default: video title
      quality: "best",
    });
    console.log("Audio downloaded successfully! 🔊🎉");

    const files = fs.readdirSync(downloadPath);
    const filePath = path.join(downloadPath, files[0]); // Assuming there's only one file in the directory

    return filePath;
  } catch (err) {
    console.error("An error occurred:", err.message);
    throw err; // Rethrow the error to be handled by the calling function
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
