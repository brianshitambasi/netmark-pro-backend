const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const path = require('path');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NetMark Pro API is running',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// Mount routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/followups', require('./routes/followupRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/gallery', require('./routes/galleryRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`íº€ NetMark Pro Server running on port ${PORT}`);
  console.log(`í³¡ Health check: http://localhost:${PORT}/health`);
  console.log(`í´ Auth endpoint: http://localhost:${PORT}/api/auth`);
  console.log(`í³ž Followups: http://localhost:${PORT}/api/followups`);
  console.log(`í¾¯ Goals: http://localhost:${PORT}/api/goals`);
  console.log(`í¶¼ï¸ Gallery: http://localhost:${PORT}/api/gallery`);
  console.log(`í³Š Dashboard: http://localhost:${PORT}/api/dashboard`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
