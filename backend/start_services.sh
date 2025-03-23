#!/bin/bash

# Activate virtual environment
source venv/bin/activate

echo "Starting FastAPI server..."
# Start the FastAPI server in the background
uvicorn app:app --reload &
PYTHON_PID=$!

echo "Starting Node.js server..."
# Start the Node.js server in the background
nodemon server.js &
NODE_PID=$!

# Function to handle termination
function cleanup {
  echo "Stopping servers..."
  kill $PYTHON_PID
  kill $NODE_PID
  exit
}

# Register the cleanup function for these signals
trap cleanup INT TERM

# Wait indefinitely
echo "Servers running. Press Ctrl+C to stop."
wait 