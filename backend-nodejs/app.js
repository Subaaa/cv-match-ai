const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = 5000;

const FASTAPI_URL = process.env.FASTAPI_URL;

app.use(cors());
app.use(express.json());

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');


const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const safeName = path.basename(decodedName, ext).replace(/[\/\\?%*:|"<>]/g, '-').trim();
    cb(null, `${safeName}${ext}`);
  },
});

const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/api/upload-cvs', upload.array('cvs', 10), async (req, res) => {
  try {
    let jobUrlsRaw = req.body.jobUrls || [];
    if (!Array.isArray(jobUrlsRaw)) {
      jobUrlsRaw = [jobUrlsRaw];
    }
    
    const jobUrls = jobUrlsRaw.map(url => {
      const match = url.match(/\/job\/(.+)$/);
      return match ? match[1] : url;
    });


    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const formData = new FormData();
    formData.append('job_codes', JSON.stringify(jobUrls));
    req.files.forEach(file => {
      const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      formData.append('cv_files', fs.createReadStream(file.path), decodedName);
    });

    const response = await fetch(`${FASTAPI_URL}/evaluate-cv`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const data = await response.json();

    res.json({
      message: 'Forwarded to FastAPI successfully!',
      data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Python api down' });
  }
});

app.get("/api/results", async (req, res) => {
  try {
    const response = await fetch(`${FASTAPI_URL}/evaluations`, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json({
      message: 'Forwarded to FastAPI successfully!',
      data,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch results" });
  }
});


app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
