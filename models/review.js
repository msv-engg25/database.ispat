// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  fullName: String,
  companyName: String,
  email: String,
  position: String,
  product: String,
  rating: Number,
  reviewTitle: String,
  reviewMessage: String,
  images: [String], // Image file names or URLs
  consent: Boolean,
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
