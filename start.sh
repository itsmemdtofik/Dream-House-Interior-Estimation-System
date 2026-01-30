#!/bin/bash

# Dream House Interior - Estimation System Startup Script
# This script starts both the backend and frontend servers

echo "🚀 Starting Dream House Interior - Estimation System..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.8 or higher.${NC}"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "$SCRIPT_DIR/backend" ]; then
    echo -e "${RED}❌ Backend directory not found.${NC}"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "$SCRIPT_DIR/frontend" ]; then
    echo -e "${RED}❌ Frontend directory not found.${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$SCRIPT_DIR/backend/venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    cd "$SCRIPT_DIR/backend"
    python3 -m venv venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}🔧 Activating virtual environment...${NC}"
source "$SCRIPT_DIR/backend/venv/bin/activate"

# Install/update dependencies
echo -e "${YELLOW}📥 Installing Python dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
pip install -q -r requirements.txt
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo -e "${GREEN}================== STARTUP INFO ==================${NC}"
echo -e "${GREEN}✅ Backend will start on: http://localhost:8000${NC}"
echo -e "${GREEN}✅ Frontend will start on: http://localhost:3000${NC}"
echo -e "${GREEN}✅ API Documentation: http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}⏳ Starting backend in 3 seconds...${NC}"
echo ""

# Function to handle cleanup
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Start backend server
cd "$SCRIPT_DIR/backend"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"

# Wait a bit for backend to start
sleep 2

# Start frontend server in a new terminal
echo -e "${YELLOW}📡 Starting frontend server...${NC}"

# Check if we're on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e "tell app \"Terminal\" to do script \"cd $SCRIPT_DIR/frontend && python3 -m http.server 3000\""
    echo -e "${GREEN}✅ Frontend started in new terminal (http://localhost:3000)${NC}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $SCRIPT_DIR/frontend && python3 -m http.server 3000; exec bash"
        echo -e "${GREEN}✅ Frontend started in new terminal (http://localhost:3000)${NC}"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $SCRIPT_DIR/frontend && python3 -m http.server 3000" &
        echo -e "${GREEN}✅ Frontend started in new terminal (http://localhost:3000)${NC}"
    else
        cd "$SCRIPT_DIR/frontend" && python3 -m http.server 3000 &
        FRONTEND_PID=$!
        echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
    fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 System is ready! Opening browser...${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:3000"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://localhost:3000" 2>/dev/null || echo "Open http://localhost:3000 in your browser"
fi

echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for backend to finish
wait $BACKEND_PID
