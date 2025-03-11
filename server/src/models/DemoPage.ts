import mongoose from 'mongoose';

const demoPageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  scriptTag: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

demoPageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const DemoPage = mongoose.model('DemoPage', demoPageSchema); 