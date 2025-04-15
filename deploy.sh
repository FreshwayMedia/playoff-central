#!/bin/bash

# Check Node.js version
echo "Checking Node.js version..."
node -v

# Check npm version
echo "Checking npm version..."
npm -v

# Install dependencies
echo "Installing dependencies..."
npm install

# Check environment variables
echo "Checking environment variables..."
if [ ! -f "production.env" ]; then
    echo "Error: production.env file not found"
    exit 1
fi

# Test MongoDB connection
echo "Testing MongoDB connection..."
node test-mongodb.js

# Test authentication endpoints
echo "Testing authentication endpoints..."
node test-auth.js

# Build the application
echo "Building the application..."
npm run build

echo "Deployment preparation complete!" 