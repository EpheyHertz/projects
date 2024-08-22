const express = require('express');
const { generateBlog, getBlogs, getBlogById, deleteBlog } = require('../controllers/blogController');
const authenticate = require('../middleware/authenticate');  // Implement this middleware to protect routes

const router = express.Router();

router.post('/generate_blog', authenticate, generateBlog);
router.get('/blogs', authenticate,getBlogs);
router.get('/blogs/:id', getBlogById);
router.delete('/blogs/:id/delete', deleteBlog);
router.get('/:id', authenticate, getBlogById,deleteBlog,getBlogs);

module.exports = router;
