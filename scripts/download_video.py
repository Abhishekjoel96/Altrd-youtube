#!/usr/bin/env python3
"""
Enhanced YouTube Video Downloader using pytubefix
Optimized for high-quality 1080p downloads with intelligent stream selection
"""

from pytubefix import YouTube
import subprocess
import tempfile
import json
import sys
import os

def select_best_stream(yt, target_resolution='1080p'):
    """
    Intelligently select the best video stream
    
    Args:
        yt (YouTube): YouTube video object
        target_resolution (str): Preferred resolution
    
    Returns:
        Stream: Best matching video stream
    """
    try:
        # First, try to find DASH streams matching target resolution
        streams = yt.streams.filter(
            progressive=False,
            file_extension='mp4',
            type='video'
        )
        
        # Sort streams by resolution, prioritizing target resolution
        sorted_streams = sorted(
            streams, 
            key=lambda s: (
                0 if s.resolution and s.resolution == target_resolution else 1,  # Prioritize target resolution
                -int(s.resolution.replace('p', '')) if s.resolution and s.resolution != 'None' else 0  # Then sort by resolution
            )
        )
        
        if sorted_streams:
            return sorted_streams[0]
        
        # Fallback to progressive streams if no DASH streams found
        progressive_streams = yt.streams.filter(
            progressive=True,
            file_extension='mp4'
        )
        
        fallback_stream = progressive_streams.get_highest_resolution()
        if fallback_stream:
            return fallback_stream
        
        raise ValueError("No suitable video streams found")
    
    except Exception as e:
        raise RuntimeError(f"Stream selection error: {str(e)}")

def select_best_audio_stream(yt):
    """
    Select the highest quality audio stream
    
    Args:
        yt (YouTube): YouTube video object
    
    Returns:
        Stream: Best audio stream
    """
    try:
        # Prioritize MP4 audio streams
        audio_streams = yt.streams.filter(
            type='audio', 
            file_extension='mp4'
        )
        
        if not audio_streams:
            # Fallback to any audio stream
            audio_streams = yt.streams.filter(type='audio')
        
        # Sort by audio bitrate, highest first
        sorted_audio_streams = sorted(
            audio_streams, 
            key=lambda s: int(s.abr.replace('kbps', '') if s.abr and s.abr != 'None' else 0), 
            reverse=True
        )
        
        if sorted_audio_streams:
            return sorted_audio_streams[0]
        
        raise ValueError("No suitable audio streams found")
    
    except Exception as e:
        raise RuntimeError(f"Audio stream selection error: {str(e)}")

def download_video(url, start_time, end_time, output_path):
    """
    Download and process YouTube video with intelligent stream handling
    
    Args:
        url (str): YouTube video URL
        start_time (float): Clip start time
        end_time (float): Clip end time
        output_path (str): Path to save final video
    
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
            
            # Download streams silently
            video_stream.download(output_path=temp_dir, filename='video.mp4')
            audio_stream.download(output_path=temp_dir, filename='audio.mp4')
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # FFmpeg command for merging and clipping
            ffmpeg_cmd = [
                'ffmpeg', '-y', '-loglevel', 'error',  # Completely suppress output
                '-i', video_file,
                '-i', audio_file,
                '-ss', str(start_time),
                '-t', str(end_time - start_time),
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-preset', 'fast',
                '-crf', '23',  # Balanced quality and file size
                output_path
            ]
            
            # Run FFmpeg with error checking
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
                "audio_bitrate": audio_stream.abr
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
    if len(sys.argv) != 5:
        print(json.dumps({
            "success": False,
            "error": "Usage: python download_video.py <url> <start_time> <end_time> <output_path>"
        }))
        sys.exit(1)
    
    url, start_time, end_time, output_path = sys.argv[1:]
    result = download_video(url, float(start_time), float(end_time), output_path)
    
    # Ensure clean JSON output with no additional characters
    sys.stdout.write(json.dumps(result) + '\n')
    sys.stdout.flush()

if __name__ == "__main__":
    main() 