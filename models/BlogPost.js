const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: function() {
      return this.status === 'published'; // required only if published
    }
  },
  content: {
    type: String,
    required: function() {
      return this.status === 'published'; // required only if published
    }
  },
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  thumbnail: {
  type: String,
  required: false // since it’s optional
}
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
