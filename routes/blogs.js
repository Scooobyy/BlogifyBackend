const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const upload = require('./middleware/upload');
const fetchuser = require('./middleware/fetchuser');
const Blog = require('../models/BlogPost');

// Create or update a blog post (used for auto/manual save via ID in body)
router.post('/save', fetchuser, [
  body('title', 'Title cannot be empty').notEmpty(),
  body('content', 'Content cannot be empty').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id, title, content, tags, status } = req.body;

    let blog;
    if (id) {
      blog = await Blog.findOne({ _id: id, user: req.user.id });
      if (!blog) return res.status(404).json({ error: 'Blog not found' });

      blog.title = title;
      blog.content = content;
      blog.tags = tags || [];
      blog.status = status || blog.status;

      await blog.save();
    } else {
      blog = new Blog({
        user: req.user.id,
        title,
        content,
        tags: tags || [],
        status: status || 'draft',
      });
      await blog.save();
    }

    res.json(blog);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});

// ✅ NEW: Update blog by ID via URL param (PUT /api/blogs/:id)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, status } = req.body;

  try {
    const updatedBlog = await Blog.findByIdAndUpdate(
      id,
      { title, content, status },
      { new: true }
    );
    res.json(updatedBlog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update blog' });
  }
});


// Get all posts by logged-in user
router.get('/myposts', fetchuser, async (req, res) => {
  try {
    const blogs = await Blog.find({ user: req.user.id }).sort({ updatedAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Delete a post
router.delete('/delete/:id', fetchuser, async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, user: req.user.id });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    await blog.deleteOne();
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Auto-create an empty draft
router.post('/auto-create', fetchuser, async (req, res) => {
  try {
    const blog = new Blog({
      user: req.user.id,
      title: 'Untitled Draft',
      content: '',
      tags: [],
      status: 'draft',
    });

    await blog.save();
    res.json(blog);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Publish a blog post
router.put('/publish/:id', fetchuser, async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, user: req.user.id });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    if (blog.status === 'published') {
      return res.status(400).json({ error: 'Blog is already published' });
    }

    blog.status = 'published';
    await blog.save();

    res.json({ message: 'Blog published successfully', blog });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Unpublish a blog post
router.put('/unpublish/:id', fetchuser, async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, user: req.user.id });
    if (!blog) return res.status(404).json({ error: 'Blog not found' });

    if (blog.status !== 'published') {
      return res.status(400).json({ error: 'Blog is not published yet' });
    }

    blog.status = 'draft';
    await blog.save();

    res.json({ message: 'Blog has been unpublished successfully', blog });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Upload thumbnail
router.post('/upload-thumbnail', fetchuser, upload.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const thumbnailPath = req.file.path;
    res.status(200).json({ url: thumbnailPath });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Thumbnail Upload Error');
  }
});

module.exports = router;
