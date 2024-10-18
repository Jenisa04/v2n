const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();

// In-memory storage for transcriptions (for simplicity)
let transcriptions = {};

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
    fileId: fileId, // Return a file ID to poll for transcription later
  });

  // After responding, handle the transcription process in the background
  const pythonProcess = spawn('python', ['transcribe_small.py', audioFilePath]);

  pythonProcess.stdout.on('data', (data) => {
    const transcription = data.toString();
    console.log(`Transcription: ${transcription}`);

    // Store the transcription in-memory using the file ID
    transcriptions[fileId] = transcription;
  });

  pythonProcess.on('close', () => {
    fs.unlinkSync(audioFilePath); // Optionally delete the file after transcription
  });
});

// Route to poll for transcription result
app.get('/transcription/:fileId', (req, res) => {
  const fileId = req.params.fileId;

  // Check if the transcription is ready
  if (transcriptions[fileId]) {
    res.json({
      transcription: transcriptions[fileId],
    });
  } else {
    res.json({
      transcription: null, // Transcription is not yet ready
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
