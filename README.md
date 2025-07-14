# Altrd Labs YouTube Clipper

A powerful YouTube video clipping application with HD quality downloads and smart aspect ratio conversion.

## 🚀 Features

- **YouTube Video Analysis**: Extract video information and create precise clips
- **HD Quality Downloads**: Support for HD (720p), Full HD (1080p), and 4K (2160p) downloads
- **Smart Aspect Ratio Conversion**: Convert clips to various aspect ratios:
  - 16:9 (Landscape)
  - 9:16 (Portrait/TikTok)
  - 1:1 (Square/Instagram)
  - 4:5 (Instagram Portrait)
  - 4:3 (Classic)
  - Original (Fast copy, no conversion)
- **Optimized Download Pipeline**: Dual-method fallback with yt-dlp and pytubefix
- **Fast Processing**: Progressive streams for speed, adaptive streams for quality
- **Local Storage**: All clips saved locally for immediate access

## 🛠 Tech Stack

### Frontend
- **Next.js 15** with Turbopack
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Orange theme** (#FF6500)

### Backend
- **Python Flask** server
- **yt-dlp** for primary video downloading
- **pytubefix** for fallback downloading
- **FFmpeg** for video processing and aspect ratio conversion

## 📋 Prerequisites

- **Node.js** 18+ 
- **Python** 3.8+
- **FFmpeg** installed and in PATH
- **Git** for version control

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Abhishekjoel96/Altrd-youtube.git
cd Altrd-youtube
```

### 2. Frontend Setup
```bash
npm install --legacy-peer-deps
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Install FFmpeg
**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
```bash
winget install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

## 🚀 Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
source venv/bin/activate
python app.py
```
Backend runs on: `http://localhost:5001`

### Start Frontend (Terminal 2)
```bash
npm run dev
```
Frontend runs on: `http://localhost:3000` (or 3001 if 3000 is busy)

## 📖 Usage

1. **Add YouTube Video**: Paste a YouTube URL and click "Analyze Video"
2. **Create Clips**: Use the timeline to select start/end times for clips
3. **Configure Settings**: 
   - Choose video quality (HD/FHD/4K)
   - Select aspect ratio
4. **Download**: Click the orange download button for each clip
5. **Access Files**: Downloaded clips are saved in `backend/downloads/`

## 🎯 Performance Optimizations

### Download Strategy
- **HD Quality**: Uses progressive streams (single file, faster)
- **FHD/4K Quality**: Uses adaptive streams (separate video/audio, higher quality)
- **Smart Fallback**: yt-dlp → pytubefix if primary method fails

### File Size Management
- **HD**: Files capped at ~500MB for speed
- **FHD**: Files capped at ~1GB for reasonable size
- **4K**: Files capped at ~2GB for quality

### FFmpeg Processing
- **Original Aspect Ratio**: Fast copy (no re-encoding)
- **Aspect Ratio Conversion**: Efficient re-encoding with optimal settings

## 🏗 Project Structure

```
├── src/                    # Frontend source
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── video/        # Video-related components
│   │   └── ...
│   └── lib/              # Utilities
├── backend/               # Python Flask backend
│   ├── app.py            # Main Flask application
│   ├── requirements.txt  # Python dependencies
│   ├── downloads/        # Downloaded clips (ignored)
│   └── venv/            # Virtual environment (ignored)
├── public/               # Static assets
└── ...
```

## 🔧 Configuration

### Environment Variables
Create `.env.local` in root directory:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### Backend Configuration
The backend automatically configures:
- Download directory: `backend/downloads/`
- Port: 5001 (configurable in app.py)
- CORS: Enabled for frontend communication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🐛 Troubleshooting

### Common Issues

**FFmpeg not found:**
- Ensure FFmpeg is installed and in your system PATH
- Test with: `ffmpeg -version`

**Port conflicts:**
- Frontend will auto-switch to port 3001 if 3000 is busy
- Backend can be changed in `app.py` (default: 5001)

**Download failures:**
- Check internet connection
- Some videos may be geo-restricted or private
- Try a different video to test

**Large file downloads:**
- Adjust quality settings for faster downloads
- Use HD for speed, FHD/4K for quality

## 📧 Support

For issues and support, please create an issue on GitHub or contact Altrd Labs.

---

Made with ❤️ by Altrd Labs
