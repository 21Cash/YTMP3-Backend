const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const { exec } = require("child_process");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Download Temporary Directory
const tempDirectory = "./temp";

if (!fs.existsSync(tempDirectory)) {
  fs.mkdirSync(tempDirectory);
}

app.get("/test", (req, res) => {
  res.status(200).send("OK");
});

app.get("/convert", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    console.error("URL parameter is required");
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    console.log("Fetching video info...");

    const info = await ytdl.getInfo(url);
    const encodedTitle = encodeURIComponent(info.videoDetails.title);
    console.log("Encoded Video title:", encodedTitle);

    const audioFormat = ytdl.chooseFormat(info.formats, {
      filter: "audioonly",
      quality: "highestaudio", // Using highest quality audio, change according to purpose
    });

    console.log("Downloading audio...");

    const videoReadableStream = ytdl.downloadFromInfo(info, {
      format: audioFormat,
    });

    const filePath = `./temp/${encodedTitle}.mp3`;

    videoReadableStream.pipe(fs.createWriteStream(filePath));

    videoReadableStream.on("end", async () => {
      console.log("Download completed, converting...");

      // I'm using higher bitrate (-b:a 320k), Change it according to your purpose
      const ffmpegCommand = `ffmpeg -i "${filePath}" -vn -acodec libmp3lame -b:a 320k -y "./temp/converted-${encodedTitle}.mp3"`;

      exec(ffmpegCommand, async (error) => {
        if (error) {
          console.error("FFMPEG conversion error:", error);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        console.log("Conversion completed, sending file...");

        const convertedFilePath = `./temp/converted-${encodedTitle}.mp3`;

        res.setHeader(
          "Content-disposition",
          `attachment; filename=${encodedTitle}.mp3`
        );
        res.setHeader("Content-type", "audio/mpeg");

        const fileReadStream = fs.createReadStream(convertedFilePath);

        fileReadStream.pipe(res);

        fileReadStream.on("end", () => {
          console.log("File sent successfully.");

          // Optionally, remove temporary files after sending
          fs.unlinkSync(filePath);
          fs.unlinkSync(convertedFilePath);
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
