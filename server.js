const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();

// In-memory storage for transcriptions and summaries
let results = {};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  },
});
const upload = multer({ storage: storage });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle file upload
app.post('/upload', upload.single('audio'), (req, res) => {
  const audioFilePath = req.file.path;
  const fileId = path.basename(audioFilePath); // Use file name as a unique ID
  console.log(`Audio file uploaded: ${audioFilePath}`);

  // Send immediate response to indicate the file was uploaded successfully
  res.json({
    message: 'File uploaded successfully!',
    fileId: fileId, // Return a file ID to poll for transcription and summary later
  });

  // After responding, handle the transcription and summary process in the background
  const pythonProcess = spawn('python', [
    'transcribe.py', // Change this to your Python script name
    audioFilePath,
  ]);

  let pythonOutput = '';

  pythonProcess.stdout.on('data', (data) => {
    pythonOutput += data.toString();
  });

  pythonProcess.on('close', () => {
    try {
      const result = JSON.parse(pythonOutput); // Parse the Python output
      console.log(`Transcription: ${result.transcription}`);
      console.log(`Summary: ${result.summary}`);

      // Store both the transcription and summary in-memory using the file ID
      results[fileId] = {
        transcription: result.transcription,
        summary: result.summary,
      };

      // Optionally delete the file after processing
      fs.unlinkSync(audioFilePath);
    } catch (error) {
      console.error('Error parsing Python output:', error);
    }
  });
});

// Route to poll for transcription and summary result
app.get('/transcription/:fileId', (req, res) => {
  const fileId = req.params.fileId;

  // Check if both the transcription and summary are ready
  if (results[fileId]) {
    res.json({
      transcription: results[fileId].transcription,
      summary: results[fileId].summary,
    });
  } else {
    res.json({
      transcription: null, // Transcription is not yet ready
      summary: null, // Summary is not yet ready
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
