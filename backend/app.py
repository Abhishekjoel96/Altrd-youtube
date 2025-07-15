from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import subprocess
import uuid
from datetime import datetime
import shutil

# Try both pytubefix and yt-dlp as fallbacks
try:
    from pytubefix import YouTube
    PYTUBE_AVAILABLE = True
except ImportError:
    PYTUBE_AVAILABLE = False

try:
    import yt_dlp
    YT_DLP_AVAILABLE = True
except ImportError:
    YT_DLP_AVAILABLE = False

app = Flask(__name__)
CORS(app)  # Enable CORS for Railway deployment

# Create downloads directory if it doesn't exist
DOWNLOADS_DIR = os.path.join(os.getcwd(), 'downloads')
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

CACHE_DIR = os.path.join(os.getcwd(), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

def get_cache_path(video_url, quality):
    from urllib.parse import urlparse, parse_qs
    parsed_url = urlparse(video_url)
    video_id = parse_qs(parsed_url.query).get('v', [None])[0]
    if not video_id:
        raise ValueError("Invalid YouTube URL")
    return os.path.join(CACHE_DIR, f"{video_id}_{quality}.mp4")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Backend is running"})

@app.route('/test-video', methods=['POST'])
def test_video():
    """Test if a YouTube video is accessible without downloading"""
    try:
        data = request.json
        video_url = data.get('url')
        
        if not video_url:
            return jsonify({"error": "URL is required"}), 400
        
        print(f"Testing video access: {video_url}")
        
        # Try yt-dlp first
        if YT_DLP_AVAILABLE:
            try:
                ydl_opts = {
                    'quiet': True,
                    'no_warnings': True,
                    'extract_flat': False,
                    'writeinfojson': False,
                    'http_headers': {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(video_url, download=False)
                    
                    # Get available formats
                    formats = info.get('formats', [])
                    
                    video_info = {
                        "title": info.get('title', 'Unknown'),
                        "length": info.get('duration', 0),
                        "author": info.get('uploader', 'Unknown'),
                        "views": info.get('view_count', 0),
                        "age_restricted": info.get('age_limit', 0) > 0,
                        "video_id": info.get('id', 'Unknown'),
                        "available_formats": len(formats),
                        "method": "yt-dlp"
                    }
                    
                    # Get sample formats
                    sample_formats = []
                    for fmt in formats[:5]:
                        sample_formats.append({
                            "format_id": fmt.get('format_id'),
                            "ext": fmt.get('ext'),
                            "resolution": fmt.get('resolution'),
                            "fps": fmt.get('fps'),
                            "vcodec": fmt.get('vcodec'),
                            "acodec": fmt.get('acodec'),
                            "filesize": fmt.get('filesize')
                        })
                    
                    video_info["sample_formats"] = sample_formats
                    
                    return jsonify({
                        "success": True,
                        "message": "Video is accessible with yt-dlp",
                        "video_info": video_info
                    })
                    
            except Exception as e:
                print(f"yt-dlp test error: {str(e)}")
        
        # Try pytubefix as fallback
        if PYTUBE_AVAILABLE:
            try:
                yt = YouTube(video_url)
                
                video_info = {
                    "title": yt.title,
                    "length": yt.length,
                    "author": yt.author,
                    "views": yt.views,
                    "age_restricted": yt.age_restricted,
                    "video_id": yt.video_id,
                    "available_streams": len(yt.streams.all()),
                    "progressive_streams": len(yt.streams.filter(progressive=True)),
                    "adaptive_streams": len(yt.streams.filter(adaptive=True)),
                    "mp4_streams": len(yt.streams.filter(file_extension='mp4')),
                    "method": "pytubefix"
                }
                
                # Get sample streams
                sample_streams = []
                for stream in yt.streams.all()[:5]:
                    sample_streams.append({
                        "itag": stream.itag,
                        "mime_type": stream.mime_type,
                        "res": stream.resolution,
                        "fps": stream.fps,
                        "vcodec": stream.video_codec,
                        "acodec": stream.audio_codec,
                        "progressive": stream.is_progressive,
                        "adaptive": stream.is_adaptive
                    })
                
                video_info["sample_streams"] = sample_streams
                
                return jsonify({
                    "success": True,
                    "message": "Video is accessible with pytubefix",
                    "video_info": video_info
                })
                
            except Exception as e:
                print(f"pytubefix test error: {str(e)}")
        
        # Both methods failed
        return jsonify({
            "success": False,
            "error": "Video not accessible with any method",
            "message": "Video is not accessible",
            "available_methods": {
                "yt-dlp": YT_DLP_AVAILABLE,
                "pytubefix": PYTUBE_AVAILABLE
            }
        }), 400
        
    except Exception as e:
        print(f"Video test error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Video is not accessible"
        }), 400

def download_with_ytdlp(video_url, temp_dir, quality='fhd', start_time=0, end_time=0):
    """Download video using yt-dlp as a fallback method"""
    if not YT_DLP_AVAILABLE:
        raise Exception("yt-dlp not available")
    
    print(f"Trying yt-dlp download for: {video_url} with quality: {quality}")
    
    # Quality-based format selection - prioritize speed and reasonable file sizes
    if quality == 'hd':
        # For HD: Use progressive streams first (faster, smaller files)
        format_selector = 'best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4][filesize<500M]/best[ext=mp4]/best'
    elif quality == 'fhd':
        # For Full HD: Limit to reasonable file sizes
        format_selector = 'best[height<=1080][ext=mp4]/best[height<=1080]/best[ext=mp4][filesize<1G]/best[ext=mp4]/best'
    elif quality == '4k':
        # For 4K: Allow larger files but still reasonable
        format_selector = 'best[height<=2160][ext=mp4]/best[height<=2160]/best[ext=mp4][filesize<2G]/best[ext=mp4]/best'
    else:
        # Default: Use original quality, prefer smaller files
        format_selector = 'best[ext=mp4][filesize<500M]/best[ext=mp4]/best'
    
    # yt-dlp options for better YouTube compatibility
    ydl_opts = {
        'outtmpl': os.path.join(temp_dir, 'temp_video.%(ext)s'),
        'format': format_selector,
        'ignoreerrors': False,
        'writeinfojson': True,
        'extractflat': False,
        'cookiefile': None,
        'merge_output_format': 'mp4',  # Ensure final output is MP4
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    }
    
    # Add partial download if times provided and end_time > start_time
    if start_time < end_time:
        ydl_opts['download_sections'] = f"*{int(start_time)}-{int(end_time)}"
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(video_url, download=True)
            
            # Find the downloaded file
            for file in os.listdir(temp_dir):
                if file.startswith('temp_video.') and file.endswith(('.mp4', '.mkv', '.webm')):
                    downloaded_file = os.path.join(temp_dir, file)
                    # Rename to standard .mp4 if needed
                    standard_path = os.path.join(temp_dir, 'temp_video.mp4')
                    if downloaded_file != standard_path:
                        os.rename(downloaded_file, standard_path)
                    return standard_path, info
            
            raise Exception("Downloaded file not found")
            
        except Exception as e:
            print(f"yt-dlp error: {str(e)}")
            raise

def download_with_pytubefix(video_url, temp_dir, quality='hd'):
    """Download video using pytubefix with optimized quality and speed based on documentation"""
    if not PYTUBE_AVAILABLE:
        raise Exception("pytubefix not available")
    
    print(f"Trying pytubefix download for: {video_url} with quality: {quality}")
    
    try:
        # Configure pytubefix with better headers
        yt = YouTube(video_url, use_oauth=False, allow_oauth_cache=True)
        print(f"Video title: {yt.title}")
        print(f"Video length: {yt.length} seconds")
        print(f"Video author: {yt.author}")
        
        # Check if video is available
        if yt.age_restricted:
            raise Exception("Video is age-restricted and cannot be downloaded")
        
        output_path = os.path.join(temp_dir, 'temp_video.mp4')
        use_adaptive = False
        
        # Quality-based stream selection strategy (based on pytubefix docs)
        if quality == 'hd':
            # For HD: Try progressive first (FASTER - single file, up to 720p)
            progressive_stream = yt.streams.filter(
                progressive=True, 
                file_extension='mp4'
            ).order_by('resolution').desc().first()
            
            if progressive_stream and progressive_stream.resolution:
                res_num = int(progressive_stream.resolution.replace('p', ''))
                if res_num >= 720:  # Good HD quality
                    print(f"✅ Using FAST progressive stream: {progressive_stream.resolution}")
                    progressive_stream.download(output_path=temp_dir, filename='temp_video.mp4')
                else:
                    print(f"Progressive quality too low ({progressive_stream.resolution}), switching to adaptive...")
                    use_adaptive = True
            else:
                print("No progressive streams found, using adaptive...")
                use_adaptive = True
        
        elif quality in ['fhd', '4k']:
            # For Full HD/4K: Must use adaptive streams (higher quality available)
            print("Using adaptive streams for high quality...")
            use_adaptive = True
        
        if use_adaptive:
            # Get video stream based on quality preference
            video_filters = yt.streams.filter(adaptive=True, only_video=True, file_extension='mp4')
            
            if quality == '4k':
                # Get 4K video (2160p+)
                video_stream = video_filters.filter(
                    lambda s: s.resolution and int(s.resolution.replace('p', '')) >= 2160
                ).order_by('resolution').desc().first()
                target_quality = "4K (2160p+)"
            elif quality == 'fhd':
                # Get Full HD video (1080p+)
                video_stream = video_filters.filter(
                    lambda s: s.resolution and int(s.resolution.replace('p', '')) >= 1080
                ).order_by('resolution').desc().first()
                target_quality = "Full HD (1080p+)"
            else:  # HD with adaptive
                # Get HD video (720p+)
                video_stream = video_filters.filter(
                    lambda s: s.resolution and int(s.resolution.replace('p', '')) >= 720
                ).order_by('resolution').desc().first()
                target_quality = "HD (720p+)"
            
            # Fallback to best available if specific quality not found
            if not video_stream:
                video_stream = video_filters.order_by('resolution').desc().first()
                target_quality = "Best available"
            
            # Get best audio stream
            audio_stream = yt.streams.filter(
                adaptive=True, 
                only_audio=True
            ).order_by('abr').desc().first()
            
            if not video_stream or not audio_stream:
                raise Exception("No suitable adaptive streams found")
            
            print(f"🎥 Video: {video_stream.resolution} ({target_quality}) - {video_stream.mime_type}")
            print(f"🔊 Audio: {audio_stream.abr} - {audio_stream.mime_type}")
            
            # Download video and audio separately
            video_path = os.path.join(temp_dir, 'temp_video_only.mp4')
            audio_path = os.path.join(temp_dir, 'temp_audio_only.m4a')
            
            print("⬇️ Downloading video track...")
            video_stream.download(output_path=temp_dir, filename='temp_video_only.mp4')
            
            print("⬇️ Downloading audio track...")
            audio_stream.download(output_path=temp_dir, filename='temp_audio_only.m4a')
            
            # Merge video and audio using FFmpeg (FAST - no re-encoding)
            print("🔗 Merging video and audio tracks (no re-encoding)...")
            merge_cmd = [
                'ffmpeg',
                '-i', video_path,
                '-i', audio_path,
                '-c:v', 'copy',  # Copy video without re-encoding (FAST)
                '-c:a', 'copy',  # Copy audio without re-encoding (FAST)
                '-shortest',     # Use shortest stream duration
                output_path,
                '-y'            # Overwrite if exists
            ]
            
            result = subprocess.run(merge_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"FFmpeg merge failed: {result.stderr}")
            
            # Clean up temporary files
            if os.path.exists(video_path):
                os.remove(video_path)
            if os.path.exists(audio_path):
                os.remove(audio_path)
        
        video_info = {
            "title": yt.title,
            "duration": yt.length,
            "author": yt.author,
            "views": getattr(yt, 'views', 0),
            "age_restricted": yt.age_restricted,
            "video_id": yt.video_id,
            "method": "pytubefix-optimized",
            "quality_used": quality,
            "stream_type": "progressive" if not use_adaptive else "adaptive"
        }
        
        return output_path, video_info
        
    except Exception as e:
        print(f"pytubefix error: {str(e)}")
        raise

@app.route('/download-clip', methods=['POST'])
def download_clip():
    try:
        data = request.json
        video_url = data.get('url')
        start_time = data.get('start')  # in seconds
        end_time = data.get('end')      # in seconds
        clip_title = data.get('title', 'clip')
        quality = data.get('quality', 'fhd')  # hd, fhd, 4k
        aspect_ratio = data.get('aspectRatio', 'original')  # original, 16:9, 9:16, 1:1, 4:3
        
        if not video_url or start_time is None or end_time is None:
            return jsonify({"error": "Missing required parameters"}), 400
        
        # Clean title for filename
        safe_title = "".join(c for c in clip_title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        if not safe_title:
            safe_title = f"clip_{uuid.uuid4().hex[:8]}"
        
        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Downloading video from: {video_url}")
            
            temp_video_path = None
            video_info = None
            download_method = None
            
            # Check cache
            cache_path = get_cache_path(video_url, quality)
            if os.path.exists(cache_path):
                temp_video_path = os.path.join(temp_dir, 'temp_video.mp4')
                shutil.copy(cache_path, temp_video_path)
                print(f"Using cached video: {cache_path}")
                download_method = "cached"
            else:
                # Try yt-dlp with partial
                if YT_DLP_AVAILABLE:
                    try:
                        temp_video_path, video_info = download_with_ytdlp(video_url, temp_dir, quality, start_time, end_time)
                        download_method = "yt-dlp"
                        # Cache the result
                        if temp_video_path:
                            shutil.copy(temp_video_path, cache_path)
                    except Exception as e:
                        print(f"yt-dlp failed: {str(e)}")
                
                # If yt-dlp failed, try pytubefix (note: pytubefix doesn't support partial, so full download)
                if not temp_video_path and PYTUBE_AVAILABLE:
                    try:
                        temp_video_path, video_info = download_with_pytubefix(video_url, temp_dir, quality)
                        download_method = "pytubefix-optimized"
                        # Cache the result
                        if temp_video_path:
                            shutil.copy(temp_video_path, cache_path)
                    except Exception as e:
                        print(f"pytubefix failed: {str(e)}")
                
                # If both methods failed
                if not temp_video_path:
                    return jsonify({
                        "error": "Cannot access video with any available method",
                        "details": "This video might be private, restricted, geo-blocked, or YouTube is blocking automated access. Try a different video or check your internet connection.",
                        "available_methods": {
                            "yt-dlp": YT_DLP_AVAILABLE,
                            "pytubefix": PYTUBE_AVAILABLE
                        }
                    }), 400
            
            print(f"Successfully downloaded using {download_method}")
            
            # Calculate duration for trimming
            duration = end_time - start_time
            
            # Output filename
            output_filename = f"{safe_title}_{start_time}s-{end_time}s.mp4"
            output_path = os.path.join(DOWNLOADS_DIR, output_filename)
            
            # Build FFmpeg command based on aspect ratio requirements
            ffmpeg_cmd = ['ffmpeg', '-i', temp_video_path, '-ss', str(start_time), '-t', str(duration)]
            
            if aspect_ratio == 'original':
                # Fast copy without re-encoding
                ffmpeg_cmd.extend(['-c', 'copy'])
            else:
                # Need to re-encode for aspect ratio conversion
                video_filters = []
                
                if aspect_ratio == '16:9':
                    # Convert to 16:9 aspect ratio
                    video_filters.append('scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2')
                elif aspect_ratio == '9:16':
                    # Convert to 9:16 aspect ratio (vertical/portrait)
                    video_filters.append('scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2')
                elif aspect_ratio == '1:1':
                    # Convert to 1:1 aspect ratio (square)
                    video_filters.append('scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2')
                elif aspect_ratio == '4:3':
                    # Convert to 4:3 aspect ratio
                    video_filters.append('scale=1440:1080:force_original_aspect_ratio=decrease,pad=1440:1080:(ow-iw)/2:(oh-ih)/2')
                elif aspect_ratio == '4:5':
                    # Convert to 4:5 aspect ratio (Instagram portrait)
                    video_filters.append('scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2')
                
                if video_filters:
                    ffmpeg_cmd.extend(['-vf', ','.join(video_filters)])
                
                # Use efficient encoding settings
                ffmpeg_cmd.extend([
                    '-c:v', 'libx264',  # Video codec
                    '-preset', 'fast',   # Encoding speed vs quality
                    '-crf', '23',        # Quality (lower = better quality)
                    '-c:a', 'copy'       # Copy audio without re-encoding
                ])
            
            ffmpeg_cmd.extend([
                '-avoid_negative_ts', 'make_zero',
                output_path,
                '-y'  # Overwrite output file if it exists
            ])
            
            print(f"Running ffmpeg command: {' '.join(ffmpeg_cmd)}")
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr}")
                return jsonify({"error": f"Video processing failed: {result.stderr}"}), 500
            
            # Check if file was created successfully
            if not os.path.exists(output_path):
                return jsonify({"error": "Failed to create trimmed video"}), 500
            
            file_size = os.path.getsize(output_path)
            
            return jsonify({
                "success": True,
                "message": "Clip downloaded successfully",
                "filename": output_filename,
                "path": output_path,
                "size": file_size,
                "duration": duration,
                "download_method": download_method,
                "video_info": video_info
            })
    
    except Exception as e:
        print(f"Error downloading clip: {str(e)}")
        return jsonify({"error": f"Failed to download clip: {str(e)}"}), 500

@app.route('/download-file/<filename>', methods=['GET'])
def download_file(filename):
    try:
        file_path = os.path.join(DOWNLOADS_DIR, filename)
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=True, download_name=filename)
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/list-downloads', methods=['GET'])
def list_downloads():
    try:
        files = []
        for filename in os.listdir(DOWNLOADS_DIR):
            if filename.endswith('.mp4'):
                file_path = os.path.join(DOWNLOADS_DIR, filename)
                file_size = os.path.getsize(file_path)
                file_modified = datetime.fromtimestamp(os.path.getmtime(file_path))
                files.append({
                    "filename": filename,
                    "size": file_size,
                    "modified": file_modified.isoformat()
                })
        return jsonify({"files": files})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print(f"Downloads will be saved to: {DOWNLOADS_DIR}")
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=False, host='0.0.0.0', port=port) 