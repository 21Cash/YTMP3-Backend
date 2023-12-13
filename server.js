const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
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

// Return all Video Urls of the Given PlayListUrl
const getUrls = async (playlistUrl) => {
  try {
    const playlist = await ytpl(playlistUrl);
    const videoUrls = playlist.items.map((item) => item.shortUrl);
    return videoUrls;
  } catch (error) {
    console.error("Error fetching playlist:", error);
    return []; // Return an empty array in case of an error
  }
};

app.get("/getUrls", async (req, res) => {
  const { playlistUrl } = req.query;

  if (!playlistUrl) {
    return res
      .status(400)
      .json({ error: "Playlist URL parameter is required" });
  }

  try {
    const urls = await getUrls(playlistUrl);
    res.status(200).json({ urls });
  } catch (error) {
    console.error("Error getting URLs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/isPlaylistUrl", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    const playlistId = await ytpl.getPlaylistID(url);
    const isPlaylist = !!playlistId;

    res.status(200).json({ isPlaylist });
  } catch (error) {
    if (error.message.includes("Unable to find a id")) {
      res.status(200).json({ isPlaylist: false });
    } else {
      console.error("Error checking playlist URL:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

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
    const videoTitle = info.videoDetails.title.replace(/[^\w\s.-]/gi, ""); // Remove special characters from title
    console.log("Video title:", videoTitle);

    const audioFormat = ytdl.chooseFormat(info.formats, {
      filter: "audioonly",
      quality: "highestaudio", // Using highest quality audio, change according to purpose
    });

    console.log("Downloading audio...");

    const videoReadableStream = ytdl.downloadFromInfo(info, {
      format: audioFormat,
    });

    const filePath = `./temp/${videoTitle}.mp3`;

    videoReadableStream.pipe(fs.createWriteStream(filePath));

    videoReadableStream.on("end", async () => {
      console.log("Download completed, converting...");

      const ffmpegCommand = `ffmpeg -i "${filePath}" -vn -acodec libmp3lame -b:a 320k -y "./temp/converted-${videoTitle}.mp3"`;

      exec(ffmpegCommand, async (error) => {
        if (error) {
          console.error("FFMPEG conversion error:", error);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        console.log("Conversion completed, sending file...");

        const convertedFilePath = `./temp/converted-${videoTitle}.mp3`;
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${videoTitle}.mp3"`
        );
        res.setHeader("Content-Type", "audio/mpeg");

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
