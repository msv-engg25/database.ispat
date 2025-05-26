require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const Review = require('./models/review');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Multer storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Save files in /uploads folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// MongoDB connection via Mongoose
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST: Submit a review
app.post('/api/reviews', upload.array('review-image', 3), async (req, res) => {
  try {
    const {
      'review-name': fullName,
      'review-company': companyName,
      'review-email': email,
      'review-position': position,
      'review-product': product,
      'rating': rating,
      'review-title': reviewTitle,
      'review-message': reviewMessage,
      'review-consent': consent,
    } = req.body;

    const images = req.files?.map(file => file.filename) || [];

    const newReview = new Review({
      fullName,
      companyName,
      email,
      position,
      product,
      rating: Number(rating),
      reviewTitle,
      reviewMessage,
      images,
      consent: consent === 'on',
    });

    await newReview.save();

    // Prepare email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `📝 New Review Submitted by ${fullName}`,
      html: `
        <h2>New Review Submitted</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Company:</strong> ${companyName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Position:</strong> ${position}</p>
        <p><strong>Product:</strong> ${product}</p>
        <p><strong>Rating:</strong> ${rating}</p>
        <p><strong>Title:</strong> ${reviewTitle}</p>
        <p><strong>Message:</strong><br>${reviewMessage}</p>
        <p><strong>Consent:</strong> ${consent === 'on' ? 'Yes' : 'No'}</p>
        ${
          images.length > 0
            ? `<p><strong>Uploaded Images:</strong><br>${images
                .map(
                  (img) =>
                    `<a href="${req.protocol}://${req.get('host')}/uploads/${img}" target="_blank">${img}</a>`
                )
                .join('<br>')}</p>`
            : ''
        }
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Review submitted and email sent successfully' });
  } catch (err) {
    console.error('❌ Error submitting review:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET: All reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error('❌ Error fetching reviews:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
