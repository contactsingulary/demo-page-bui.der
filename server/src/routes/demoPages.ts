import express from 'express';
import { DemoPage } from '../models/DemoPage';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Get all demo pages
router.get('/', async (req, res) => {
  try {
    const pages = await DemoPage.find().sort({ createdAt: -1 });
    res.json(pages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching demo pages' });
  }
});

// Get a single demo page
router.get('/:id', async (req, res) => {
  try {
    const page = await DemoPage.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ message: 'Demo page not found' });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching demo page' });
  }
});

// Create a new demo page
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, scriptTag } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // Upload image to Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    const uploadResponse = await cloudinary.uploader.upload(dataURI, {
      folder: 'demo-pages',
    });

    const page = new DemoPage({
      name,
      imageUrl: uploadResponse.secure_url,
      scriptTag,
    });

    await page.save();
    res.status(201).json(page);
  } catch (error) {
    res.status(500).json({ message: 'Error creating demo page' });
  }
});

// Delete a demo page
router.delete('/:id', async (req, res) => {
  try {
    const page = await DemoPage.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ message: 'Demo page not found' });
    }

    // Extract public_id from Cloudinary URL
    const publicId = page.imageUrl.split('/').slice(-1)[0].split('.')[0];
    
    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(`demo-pages/${publicId}`);
    
    await page.deleteOne();
    res.json({ message: 'Demo page deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting demo page' });
  }
});

export { router }; 