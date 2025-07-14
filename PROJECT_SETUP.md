# Altrd Labs YouTube Clipper - Setup Guide

A complete YouTube video clipping application with local download functionality using pytubefix.

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and **npm** for the frontend
2. **Python 3.8+** for the backend
3. **FFmpeg** for video processing
   - **macOS**: `brew install ffmpeg`
   - **Ubuntu/Debian**: `sudo apt update && sudo apt install ffmpeg`
   - **Windows**: Download from [FFmpeg official site](https://ffmpeg.org/download.html)

## 🎯 Setup Instructions

### 1. Frontend Setup (Next.js)

```bash
# Install frontend dependencies
npm install --legacy-peer-deps

# Start the frontend development server
npm run dev
```

The frontend will be available at: **http://localhost:3000**

### 2. Backend Setup (Python Flask)

```bash
# Navigate to backend directory
cd backend

# Run the automated setup script
./start.sh
```

Or manually:

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start the backend server
python app.py
```

The backend will be available at: **http://localhost:5001**

## 🎬 How to Use

1. **Start both servers**: Frontend (port 3000) and Backend (port 5001)
2. **Open the app**: Go to http://localhost:3000
3. **Create clips**:
   - Enter a YouTube URL
   - Select start and end times using the slider
   - Click "Save to My Clips"
4. **Download clips**:
   - Go to "My Clips" tab
   - Click "Download" button on any saved clip
   - The trimmed video will be downloaded to your local device

## 🔧 Features

- ✅ YouTube video URL input and validation
- ✅ Interactive video player with time selection
- ✅ Visual time range slider
- ✅ Clip management (save/remove)
- ✅ **Local clip downloading with pytubefix**
- ✅ Video trimming using FFmpeg
- ✅ Dark/Light theme support
- ✅ Modern orange color scheme

## 📁 Project Structure

```
youtube-repurpose-web-1 3/
├── src/                    # Frontend (Next.js)
│   ├── app/
│   ├── components/
│   └── lib/
├── backend/               # Backend (Python Flask)
│   ├── app.py            # Main Flask application
│   ├── requirements.txt   # Python dependencies
│   ├── start.sh          # Automated setup script
│   └── downloads/        # Downloaded clips storage
├── package.json          # Frontend dependencies
└── PROJECT_SETUP.md      # This file
```

## 🔌 API Endpoints

The backend provides these endpoints:

- `POST /download-clip` - Download and trim a YouTube clip
- `GET /download-file/<filename>` - Download a processed clip
- `GET /list-downloads` - List all downloaded clips
- `GET /health` - Health check

## 🛠 Troubleshooting

### Common Issues

1. **Frontend won't start**:
   ```bash
   npm install --legacy-peer-deps
   npm run dev
   ```

2. **Backend connection errors**:
   - Ensure backend is running on port 5001
   - Check if Python virtual environment is activated
   - Verify FFmpeg is installed: `ffmpeg -version`

3. **Download failures**:
   - Check YouTube URL is valid and accessible
   - Ensure FFmpeg is in your system PATH
   - Some videos may be restricted

4. **CORS errors**:
   - Backend has CORS enabled for development
   - Ensure both frontend (3000) and backend (5001) are running

### Port Conflicts

If ports 3000 or 5001 are in use:

- **Frontend**: Change port in `package.json` dev script
- **Backend**: Modify port in `backend/app.py` (Note: Port 5000 conflicts with macOS AirTunes)

## 📱 Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## 🔒 Security Notes

- This is a development setup with CORS enabled for all origins
- For production, configure proper CORS settings
- YouTube download restrictions may apply to certain videos

## 🎨 Customization

The app uses a bright orange color scheme (#FF6500). To customize:

1. Update colors in `src/app/globals.css`
2. Modify theme colors in component files
3. Adjust Tailwind configuration if needed

---

**Ready to start clipping! 🎬✂️** 