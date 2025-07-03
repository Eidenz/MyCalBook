const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const authMiddleware = require('../middleware/auth.cjs');

// Use memoryStorage to process the image before saving it to disk.
const storage = multer.memoryStorage();

// File filter to accept only common image types.
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('File upload only supports the following filetypes: jpeg, jpg, png, gif, webp'));
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 40 }, // 40MB file size limit
    fileFilter: fileFilter
});

// POST /api/upload/image
// The route to upload, process, and save a single image.
router.post('/image', authMiddleware, upload.single('image'), async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        // Generate a new unique filename with the .webp extension
        const filename = `image-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const outputPath = path.join(__dirname, '..', 'public', 'uploads', filename);

        // Process the image with sharp:
        // 1. Resize to fit within 2048x2048, without enlarging smaller images.
        // 2. Convert to WebP format with a quality of 80.
        // 3. Save the processed image to the output path.
        await sharp(req.file.buffer)
            .resize({
                width: 2048,
                height: 2048,
                fit: 'inside',
                withoutEnlargement: true,
            })
            .toFormat('webp')
            .webp({ quality: 80 })
            .toFile(outputPath);

        // Construct the full, publicly accessible URL for the uploaded file.
        const port = process.env.PORT || 5001;
        const serverBaseUrl = process.env.SERVER_BASE_URL || `http://localhost:${port}`;
        const imageUrl = `${serverBaseUrl}/public/uploads/${filename}`;

        res.json({ imageUrl });

    } catch (error) {
        console.error('Image processing error:', error);
        res.status(500).json({ error: 'Failed to process image.' });
    }
}, (error, req, res, next) => {
    // This is an error handling middleware specifically for multer errors.
    res.status(400).json({ error: error.message });
});

module.exports = router;