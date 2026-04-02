#!/bin/bash

# Define where the application lives
INSTALL_DIR="/opt/urdu-translator"

# Setup and Start Backend
cd "$INSTALL_DIR/backend"
# Create a venv for the user if it doesn't exist yet
if [ ! -d "venv" ]; then
    echo "First run: Setting up Python environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies if they aren't installed. 
# We use a marker file to make it fast.
if [ ! -f ".installed" ]; then
    echo "Installing Python dependencies (this only happens once)..."
    TMPDIR="/tmp" pip install -r requirements.txt
    touch .installed
fi

# Run backend in the background
echo "Starting FastAPI backend..."
uvicorn main:app --port 8000 &
BACKEND_PID=$!

# Start Frontend
echo "Starting Electron frontend..."
"$INSTALL_DIR/frontend/urdu-translator-frontend"

# When the frontend closes, kill the backend
kill $BACKEND_PID
