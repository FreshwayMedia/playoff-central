// Load environment variables based on NODE_ENV
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? './production.env' : './.env'
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import models
const { User } = require('./models');

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://web-production-319e7.up.railway.app", "wss://web-production-319e7.up.railway.app"]
    }
  }
}));

// Use morgan in production format
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://web-production-319e7.up.railway.app',
      process.env.CORS_ORIGIN
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    mongoose.set('debug', process.env.NODE_ENV === 'development');
    
    // Connect to MongoDB with simplified options
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 0
    });

    console.log('Connected to MongoDB');

    // Verify connection
    const db = mongoose.connection;
    const adminDb = db.db.admin();
    const pingResult = await adminDb.ping();
    
    if (pingResult.ok === 1) {
      console.log('MongoDB connection is healthy');
    } else {
      throw new Error('MongoDB ping failed');
    }

    // Handle index creation
    try {
      // Drop existing indexes to prevent conflicts
      await User.collection.dropIndexes();
      
      // Create new index with consistent options
      await User.collection.createIndex(
        { email: 1 },
        {
          unique: true,
          background: true,
          name: 'email_1'
        }
      );
      
      console.log('User indexes created successfully');
    } catch (error) {
      if (error.code !== 85) { // Ignore IndexOptionsConflict
        console.error('Error creating user indexes:', error);
      }
    }

  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Start server
const startServer = async () => {
  // Connect to MongoDB first
  const isConnected = await connectDB();
  if (!isConnected) {
    console.error('Failed to connect to MongoDB. Server will not start.');
    process.exit(1);
  }

  // Import and use routes
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error details:', {
      message: err.message,
      path: req.path,
      method: req.method,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        body: req.body 
      })
    });
    
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { 
        path: req.path,
        timestamp: new Date().toISOString()
      })
    });
  });

  const PORT = process.env.NODE_ENV === 'production' ? process.env.PORT || 3000 : 3001;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  });

  // WebSocket setup with heartbeat
  const wss = new WebSocket.Server({ server });

  function heartbeat() {
    this.isAlive = true;
  }

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    ws.on('message', (message) => {
      try {
        console.log('Received:', message);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // Ping clients every 30 seconds to check connection
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    clearInterval(interval);
    server.close(() => {
      console.log('Server closed');
      mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed');
        process.exit(0);
      });
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Attach WebSocket server to HTTP server
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
};

startServer(); 