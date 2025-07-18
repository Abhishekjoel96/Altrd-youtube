#!/usr/bin/env python3
"""
Enhanced YouTube Video Downloader with Robust Audio and Subtitle Handling
"""

from pytubefix import YouTube
import subprocess
import tempfile
import json
import sys
import os

def select_best_stream(yt, target_resolution='1080p'):
    """Select the best video stream with intelligent resolution selection"""
    try:
        # Prioritize DASH streams first
        streams = yt.streams.filter(
            progressive=False,
            file_extension='mp4',
            type='video'
        )
        
        sorted_streams = sorted(
            streams, 
            key=lambda s: (
                0 if s.resolution == target_resolution else 1,
                -int(s.resolution.replace('p', '') if s.resolution else 0)
            )
        )
        
        return sorted_streams[0] if sorted_streams else yt.streams.get_highest_resolution()
    
    except Exception as e:
        raise RuntimeError(f"Video stream selection error: {str(e)}")

def select_best_audio_stream(yt):
    """Select the highest quality audio stream"""
    try:
        # Prioritize high bitrate MP4 audio streams
        audio_streams = yt.streams.filter(
            type='audio', 
            file_extension='mp4'
        )
        
        sorted_audio_streams = sorted(
            audio_streams, 
            key=lambda s: int(s.abr.replace('kbps', '') if s.abr else 0), 
            reverse=True
        )
        
        return sorted_audio_streams[0] if sorted_audio_streams else None
    
    except Exception as e:
        raise RuntimeError(f"Audio stream selection error: {str(e)}")

def download_video(url, start_time, end_time, output_path, srt_path=None):
    """
    Download and process YouTube video with advanced stream handling
    
    Args:
        url (str): YouTube video URL
        start_time (float): Clip start time
        end_time (float): Clip end time
        output_path (str): Path to save final video
        srt_path (str, optional): Path to subtitle file
    
    Returns:
        dict: Download result with metadata
    """
    try:
        # Create YouTube object
        yt = YouTube(url)
        
        # Validate video length
        video_length = yt.length
        if end_time > video_length:
            end_time = min(end_time, video_length)
        
        # Select best streams
        video_stream = select_best_stream(yt)
        audio_stream = select_best_audio_stream(yt)
        
        # Use temporary directory for intermediate files
        with tempfile.TemporaryDirectory() as temp_dir:
            video_file = os.path.join(temp_dir, 'video.mp4')
            audio_file = os.path.join(temp_dir, 'audio.mp4')
            
            # Download streams
            video_stream.download(output_path=temp_dir, filename='video.mp4')
            
            # Audio is optional
            if audio_stream:
                audio_stream.download(output_path=temp_dir, filename='audio.mp4')
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Prepare FFmpeg command with comprehensive options
            ffmpeg_cmd = [
                'ffmpeg', '-y', '-loglevel', 'error',
                '-i', video_file
            ]
            
            # Add audio input if available
            if audio_stream and os.path.exists(audio_file):
                ffmpeg_cmd.extend(['-i', audio_file])
            
            # Add subtitle input if available
            if srt_path and os.path.exists(srt_path):
                ffmpeg_cmd.extend(['-vf', f'subtitles={srt_path}'])
            
            # Clip and encode settings
            ffmpeg_cmd.extend([
                '-ss', str(start_time),
                '-t', str(end_time - start_time),
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'fast',
                '-crf', '23',
                output_path
            ])
            
            # Execute FFmpeg
            subprocess.run(
                ffmpeg_cmd, 
                capture_output=True, 
                text=True,
                check=True
            )
            
            return {
                "success": True,
                "output_path": output_path,
                "title": yt.title,
                "resolution": video_stream.resolution,
                "duration": end_time - start_time,
                "video_fps": video_stream.fps,
                "audio_bitrate": audio_stream.abr if audio_stream else "N/A"
            }
    
    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": f"FFmpeg error: {e.stderr}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 5:
        print(json.dumps({
            "success": False,
            "error": "Usage: python download_video.py <url> <start_time> <end_time> <output_path> [srt_path]"
        }))
        sys.exit(1)
    
    url = sys.argv[1]
    start_time = float(sys.argv[2])
    end_time = float(sys.argv[3])
    output_path = sys.argv[4]
    srt_path = sys.argv[5] if len(sys.argv) > 5 else None
    
    result = download_video(url, start_time, end_time, output_path, srt_path)
    
    # Ensure clean JSON output
    sys.stdout.write(json.dumps(result) + '\n')
    sys.stdout.flush()

if __name__ == "__main__":
    main() 