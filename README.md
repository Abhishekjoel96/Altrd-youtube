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
- **Vercel Deployment Ready**: Configured for easy deployment on Vercel

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

## 🌐 Vercel Deployment

This project is configured for easy deployment on Vercel:

### 1. Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Abhishekjoel96/Altrd-youtube)

### 2. Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 3. Environment Variables
No additional environment variables needed for basic functionality.

## 📖 Usage

1. **Add YouTube Video**: Paste a YouTube URL and click "Analyze Video"
2. **Create Clips**: Use the timeline to select start/end times for clips
3. **Configure Settings**: 
   - Quality is automatically set to 1080p
   - Select aspect ratio for your target platform
4. **Download**: Click the orange download button for each clip
5. **Access Files**: Downloaded clips are saved locally

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
├── vercel.json           # Vercel deployment config
└── ...
```

## 🔧 API Endpoints

### POST /api/download-clip
Downloads and trims a YouTube video clip.

### GET /api/download-file/<filename>
Downloads a processed clip file.

### GET /api/health
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
