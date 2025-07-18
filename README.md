# 🛠️ YouTube Repurpose Web App

## 🚀 Enhanced Video Download with pytubefix

### 🎥 Key Download Features
- **1080p High-Quality Downloads**
- **Intelligent Stream Selection**
- **Adaptive Streaming Support**
- **Robust Error Handling**
- **Detailed Logging**

### 📦 Prerequisites
- Python 3.8+
- FFmpeg
- Node.js
- pip

### 🔧 Installation Steps

#### 1. Install Python Dependencies
```bash
pip3 install pytubefix
```

#### 2. Install Node.js Dependencies
```bash
   npm install
   ```

### 🌟 Download Capabilities

#### Stream Selection Strategy
- Prioritizes 1080p DASH streams
- Fallback to highest available quality
- Separate audio and video stream handling
- Intelligent resolution and bitrate selection

#### Logging and Monitoring
- Comprehensive logging to `/tmp/pytubefix_download.log`
- Detailed error tracking
- Performance metrics

### 🔍 How It Works

1. **Stream Analysis**
   - Examines available video streams
   - Selects optimal 1080p stream
   - Handles both progressive and adaptive streams

2. **Audio-Video Processing**
   - Separate high-quality audio and video streams
   - Uses FFmpeg for precise merging
   - Supports clipping with frame-accurate timestamps

3. **Error Resilience**
   - Multiple fallback mechanisms
   - Graceful degradation if high-quality streams unavailable

### 🛠️ Customization

Modify `scripts/download_video.py` to adjust:
- Target resolution
- Bitrate preferences
- Logging verbosity

### 🔒 Security
- OAuth support (optional)
- Secure stream selection
- Temporary file management

### 📊 Performance Metrics
- Minimal overhead
- Efficient stream filtering
- Low memory footprint

### 🌐 Compatibility
- YouTube video formats
- Multiple resolutions
- Various codec support

### 🆘 Troubleshooting
- Check `/tmp/pytubefix_download.log` for detailed logs
- Ensure FFmpeg is installed
- Verify Python and pip configurations

### 📝 License
MIT License

### 🤝 Contributing
Pull requests welcome! Please read our contribution guidelines.
