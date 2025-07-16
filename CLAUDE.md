# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Next.js)
```bash
# Install dependencies (use legacy-peer-deps for React 19 RC)
npm install --legacy-peer-deps

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Backend (Python Flask)
```bash
# Navigate to backend directory
cd backend

# Setup virtual environment and install dependencies
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start backend server
python app.py
```

### Full Stack Development
- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:5001`
- Both servers must be running for full functionality

## Architecture Overview

### Project Structure
- **Frontend**: Next.js 15 with React 19 RC and TypeScript
- **Backend**: Python Flask API with video processing capabilities
- **Core Function**: YouTube video clipping and local downloading

### Key Components

#### Frontend (`/src/`)
- `app/page.tsx` - Main homepage with tabbed interface (Create Clips / My Clips)
- `components/YouTubeClipper.tsx` - Primary video clipping component
- `components/SavedClips.tsx` - Saved clips management
- `components/video/` - Video-related utilities and components
- `components/ui/` - Reusable UI components (shadcn/ui)

#### Backend (`/backend/`)
- `app.py` - Main Flask application with video processing endpoints
- Uses `pytubefix` as primary downloader, `yt-dlp` as fallback
- FFmpeg for video trimming and aspect ratio conversion
- Supports partial downloads and caching to avoid re-downloading

### Data Flow
1. User enters YouTube URL in frontend
2. Video loads in embedded iframe player
3. User selects clip times using range slider
4. Clip metadata saved to local state
5. Download request sent to Flask backend
6. Backend processes video (download → trim → format conversion)
7. Processed clip returned for download

### Key Features
- **Quality**: Hardcoded 1080p downloads for consistency
- **Aspect Ratios**: 9:16, 1:1, 4:5, 16:9, 4:3, Original
- **Performance**: Partial downloads, video caching, dual-method fallback
- **UI**: Orange theme (#FF6500), dark/light mode support

## Dependencies

### Frontend Stack
- Next.js 15 with Turbopack
- React 19 RC with TypeScript
- Tailwind CSS + shadcn/ui components
- React Hook Form + Zod validation
- Radix UI primitives, Lucide icons

### Backend Stack
- Flask 2.3.3 with CORS support
- pytubefix 6.9.2 (primary downloader)
- yt-dlp 2023.10.13 (fallback downloader)
- FFmpeg (required system dependency)

## Development Notes

### Prerequisites
- Node.js 18+, Python 3.8+, FFmpeg installed
- Install FFmpeg: `brew install ffmpeg` (macOS), `sudo apt install ffmpeg` (Ubuntu)

### No Testing Framework
- Project currently has no test files or testing setup
- Uses basic ESLint with Next.js defaults
- No Prettier configuration

### API Endpoints
- `POST /download-clip` - Main video processing endpoint
- `GET /download-file/<filename>` - File download
- `GET /list-downloads` - List processed clips
- `GET /health` - Health check

### Railway Deployment
- Configured for Railway deployment via `railway.json` and `Procfile`
- Nixpacks build configuration included
- Backend serves as the primary process in production