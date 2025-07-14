# YouTube Clipper Backend

This is the Python backend service for downloading and trimming YouTube clips using pytubefix.

## Prerequisites

1. **Python 3.8+** installed on your system
2. **FFmpeg** installed and available in your system PATH
   - **macOS**: `brew install ffmpeg`
   - **Ubuntu/Debian**: `sudo apt update && sudo apt install ffmpeg`
   - **Windows**: Download from [FFmpeg official site](https://ffmpeg.org/download.html)

## Setup

1. **Create a virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   ```

2. **Activate the virtual environment**:
   - **macOS/Linux**: `source venv/bin/activate`
   - **Windows**: `venv\Scripts\activate`

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Backend

1. **Start the Flask server**:
   ```bash
   python app.py
   ```

2. The server will start on `http://localhost:5001`

3. **Test the server**:
   ```bash
   curl http://localhost:5001/health
   ```

## API Endpoints

### POST /download-clip
Downloads and trims a YouTube video clip.

**Request Body**:
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "start": 30,
  "end": 90,
  "title": "My Clip"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Clip downloaded successfully",
  "filename": "My_Clip_30s-90s.mp4",
  "path": "/path/to/downloads/My_Clip_30s-90s.mp4",
  "size": 1234567,
  "duration": 60
}
```

### GET /download-file/<filename>
Downloads a processed clip file.

### GET /list-downloads
Lists all downloaded clips.

### GET /health
Health check endpoint.

## Downloads

Downloaded clips are saved in the `downloads` directory within the backend folder.

## Troubleshooting

1. **FFmpeg not found**: Make sure FFmpeg is installed and in your PATH
2. **Port 5001 in use**: Change the port in `app.py` if needed (default changed from 5000 to 5001 due to macOS AirTunes conflict)
3. **CORS issues**: The backend has CORS enabled for all origins during development
4. **YouTube access**: Some videos might be restricted or unavailable for download 