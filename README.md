# Altrd Labs YouTube Clipper

A powerful YouTube video clipping application with 1080p downloads, smart aspect ratio conversion, and optimized performance.

## 🚀 Features

- **YouTube Video Analysis**: Extract video information and create precise clips
- **1080p Quality Downloads**: Hardcoded to download in Full HD (1080p) for consistent quality
- **Smart Aspect Ratio Conversion**: Convert clips to various aspect ratios:
  - 9:16 (Portrait/TikTok)
  - 1:1 (Square/Instagram)
  - 4:5 (Instagram Portrait)
  - 16:9 (Landscape)
  - 4:3 (Classic)
  - Original (Fast copy, no conversion)
- **Optimized Download Pipeline**: 
  - Partial downloads using yt-dlp for faster processing
  - Caching system to avoid re-downloading same videos
  - Dual-method fallback with yt-dlp and pytubefix
- **Fast Processing**: Progressive streams for speed, adaptive streams for quality
- **Railway Deployment Ready**: Configured for seamless deployment on Railway

## 🛠 Tech Stack

### Frontend
- **Next.js 15** with Turbopack
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Orange theme** (#FF6500)

### Backend
- **Python Flask** server
- **yt-dlp** for primary video downloading with partial download support
- **pytubefix** for fallback downloading
- **FFmpeg** for video processing and aspect ratio conversion

## 📋 Prerequisites

- **Node.js** 18+ 
- **Python** 3.8+
- **FFmpeg** installed and in PATH
- **Git** for version control

## 🔧 Local Development

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

## 🚀 Running Locally

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
Frontend runs on: `http://localhost:3000`

## 🌐 Railway Deployment

This project is optimized for Railway deployment, which provides:
- ✅ Full FFmpeg support out of the box
- ✅ Persistent file storage
- ✅ Python + Node.js support
- ✅ Works exactly like local environment
- ✅ Zero configuration needed

### 1. Deploy to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/github.com/Abhishekjoel96/Altrd-youtube)

### 2. Manual Deployment
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository: `Abhishekjoel96/Altrd-youtube`
6. Railway will automatically detect and deploy both services

### 3. Configuration
Railway automatically handles:
- FFmpeg installation
- Python and Node.js setup
- Environment variables
- Port configuration
- Build process

## 📖 Usage

1. **Add YouTube Video**: Paste a YouTube URL and click "Analyze Video"
2. **Create Clips**: Use the timeline to select start/end times for clips
3. **Configure Settings**: 
   - Quality is automatically set to 1080p
   - Select aspect ratio for your target platform
4. **Download**: Click the orange download button for each clip
5. **Access Files**: Downloaded clips are saved and can be downloaded

## 🎯 Performance Optimizations

### Download Strategy
- **Partial Downloads**: Only downloads the clip portion using yt-dlp `--download-sections`
- **Caching**: Stores downloaded videos to avoid re-downloading
- **Smart Fallback**: yt-dlp → pytubefix if primary method fails

### Quality Settings
- **Hardcoded 1080p**: Ensures consistent Full HD quality
- **Optimized Format Selection**: Prioritizes MP4 with reasonable file sizes

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
│   └── cache/           # Video cache (ignored)
├── nixpacks.toml         # Railway build configuration
├── Procfile             # Railway process configuration
└── ...
```

## 🔧 API Endpoints

### POST /download-clip
Downloads and trims a YouTube video clip.

### GET /download-file/<filename>
Downloads a processed clip file.

### GET /health
Health check endpoint.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with Next.js and Flask
- Uses yt-dlp for YouTube downloading
- Powered by FFmpeg for video processing
- Deployed on Railway for full compatibility
