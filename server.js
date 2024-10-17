const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();

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

// Route to handle recording and transcription
app.post('/record', upload.single('audio'), (req, res) => {
  const audioFilePath = req.file.path;
  console.log(`Audio file saved: ${audioFilePath}`);

  const pythonProcess = spawn('python', ['transcribe.py', audioFilePath]);

  pythonProcess.stdout.on('data', (data) => {
    const transcription = data.toString();
    console.log(`Transcription: ${transcription}`);
    res.json({
      message: 'Audio recorded successfully!',
      path: audioFilePath,
      transcription,
    });
  });

  // pythonProcess.on('close', () => {
  //   fs.unlinkSync(audioFilePath); // Optionally delete the file after transcription
  // });
});

// Route to handle file upload and transcription
app.post('/upload', upload.single('audio'), (req, res) => {
  const audioFilePath = req.file.path;
  console.log(`Audio file uploaded: ${audioFilePath}`);

  const pythonProcess = spawn('python', ['transcribe.py', audioFilePath]);

  pythonProcess.stdout.on('data', (data) => {
    const transcription = data.toString();
    console.log(`Transcription: ${transcription}`);
    res.json({
      message: 'File uploaded successfully!',
      path: audioFilePath,
      transcription,
    });
  });

  // pythonProcess.on('close', () => {
  //   fs.unlinkSync(audioFilePath); // Optionally delete the file after transcription
  // });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
