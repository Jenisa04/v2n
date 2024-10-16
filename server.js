const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Configure multer to save files with the correct extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Get the file extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext); // Save with extension
  },
});

const upload = multer({ storage: storage });

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// succesful recording
// // Route to handle the audio upload
// app.post('/record', upload.single('audio'), (req, res) => {
//   const audioFilePath = req.file.path;
//   console.log(`Audio file saved: ${audioFilePath}`);
//   res.send({ message: 'Audio recorded successfully!', path: audioFilePath });
// });

const { spawn } = require('child_process');

app.post('/record', upload.single('audio'), (req, res) => {
  const audioFilePath = req.file.path;
  console.log(`Audio file saved: ${audioFilePath}`);

  // Run the transcription script
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

  // pythonProcess.stderr.on('data', (data) => {
  //   console.error(`Error: ${data}`);
  //   res.status(500).send('Error processing transcription');
  // });

  pythonProcess.on('close', (code) => {
    // Optional: Delete audio file after transcription
    fs.unlinkSync(audioFilePath);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
