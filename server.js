const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.get("/test", (req, res) => {
  res.send("<h1>Hello World</h1>");
});

app.get("/convert", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    console.error("URL parameter is required");
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    console.log("Fetching video info...");

    // Get video info
    const info = await ytdl.getInfo(url);

    // Encode the title to remove invalid characters
    const encodedTitle = encodeURIComponent(info.videoDetails.title);

    // Log the encoded title
    console.log("Encoded Video title:", encodedTitle);

    // Choose the audio format
    const audioFormat = ytdl.chooseFormat(info.formats, {
      filter: "audioonly",
    });

    // Set headers for the response using the encoded title
    res.setHeader(
      "Content-disposition",
      `attachment; filename=${encodedTitle}.mp3`
    );
    res.setHeader("Content-type", "audio/mpeg");

    console.log("Sending audio stream...");

    // Pipe the audio data directly to the response
    ytdl(url, { format: audioFormat })
      .on("error", (error) => {
        if (
          error.message.includes("ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC")
        ) {
          console.error("SSL decryption error. Request rejected.");
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          console.error(error);
          res.status(500).json({ error: "Internal Server Error" });
        }
      })
      .on("end", () => {
        console.log("Completed");
      })
      .pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
