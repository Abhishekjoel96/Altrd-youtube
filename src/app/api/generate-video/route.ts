import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { ensureFontExists } from '@/lib/fonts';
import { createTextImage } from '@/lib/image-generator';

let resolvedFfmpegPath:string | undefined;
try {
  resolvedFfmpegPath = require('ffmpeg-static');
} catch {}
if (!resolvedFfmpegPath || !fsSync.existsSync(resolvedFfmpegPath as string)) {
  // fallback to common system paths
  const common = ['/usr/bin/ffmpeg','/opt/homebrew/bin/ffmpeg','/usr/local/bin/ffmpeg'];
  resolvedFfmpegPath = common.find(p=>fsSync.existsSync(p));
}
if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath as string);
  console.log('Using ffmpeg at',resolvedFfmpegPath);
} else {
  console.warn('FFmpeg binary not found. Ensure ffmpeg is installed.');
}

export const runtime = 'nodejs';

interface Caption {
  start: string;
  end: string;
  text: string;
}

// Helper function to download video using pytubefix
async function downloadVideoWithPytubefix(
  youtubeUrl: string, 
  startTime: number, 
  endTime: number, 
  outputPath: string,
  srtPath?: string  // Add optional subtitle path
): Promise<{ success: boolean; error?: string; resolution?: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'download_video.py');
    
    // Prepare command arguments
    const args = [
      scriptPath,
      youtubeUrl,
      startTime.toString(),
      endTime.toString(),
      outputPath
    ];

    // Add SRT path if available
    if (srtPath) {
      args.push(srtPath);
    }
    
    console.log(`Calling Python script: python3 ${args.join(' ')}`);
    
    const python = spawn('python3', args);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
      // Log Python script output for debugging
      console.log('Python script output:', data.toString().trim());
    });

    python.on('close', (code) => {
      if (code === 0) {
        try {
          // Parse JSON result from Python script
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (error) {
          console.error('Failed to parse Python script output:', stdout);
          resolve({
            success: false,
            error: `Failed to parse download result: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      } else {
        console.error('Python script failed with code:', code);
        console.error('stderr:', stderr);
        resolve({
          success: false,
          error: `Download script failed with exit code ${code}: ${stderr}`
        });
      }
    });
  });
}

// Helper function to get canvas dimensions based on aspect ratio
function getCanvasDimensions(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '4:5':
      return { width: 1080, height: 1350 };
    case '3:4':
      return { width: 1080, height: 1440 };
    case '9:16':
    default:
      return { width: 1080, height: 1920 };
  }
}

// Helper function to get video crop and scale settings
function getVideoProcessing(aspectRatio: string): { crop: string; scale: string } {
  switch (aspectRatio) {
    case '16:9':
      // For horizontal, crop to 16:9 and scale to full width
      return { crop: 'crop=ih*16/9:ih', scale: 'scale=1920:1080' };
    case '1:1':
      // For square, crop to square and scale
      return { crop: 'crop=ih:ih', scale: 'scale=1080:1080' };
    case '4:5':
      // For 4:5, crop accordingly and scale
      return { crop: 'crop=ih*4/5:ih', scale: 'scale=1080:1350' };
    case '3:4':
      // For 3:4, crop accordingly and scale
      return { crop: 'crop=ih*3/4:ih', scale: 'scale=1080:1440' };
    case '9:16':
    default:
      // For vertical, crop to square and scale
      return { crop: 'crop=ih:ih', scale: 'scale=1080:1080' };
  }
}

const generateSrtContent = (captions: Caption[], startTimeOffset: number): string => {
  // Ensure captions are sorted by start time
  const sortedCaptions = captions.sort((a, b) => 
    timeToSeconds(a.start) - timeToSeconds(b.start)
  );

  return sortedCaptions
    .filter(caption => caption.text.trim() !== '') // Remove empty captions
    .map((caption, index) => {
      // Convert timestamps to seconds, subtract the start offset, then convert back
      const startSeconds = timeToSeconds(caption.start) - startTimeOffset;
      const endSeconds = timeToSeconds(caption.end) - startTimeOffset;
      
      // Ensure times are not negative and end time is after start time
      const adjustedStart = Math.max(0, startSeconds);
      const adjustedEnd = Math.max(adjustedStart + 0.1, endSeconds);
      
      // Convert to SRT timestamp format (HH:MM:SS,mmm)
      const srtStart = formatTimestamp(adjustedStart).replace('.', ',');
      const srtEnd = formatTimestamp(adjustedEnd).replace('.', ',');
      
      // Trim and clean caption text
      const cleanText = caption.text.trim()
        .replace(/\n+/g, ' ') // Replace multiple newlines with single space
        .replace(/\s+/g, ' '); // Normalize whitespace
      
      return `${index + 1}\n${srtStart} --> ${srtEnd}\n${cleanText}\n`;
    })
    .join('\n');
};

// Helper function to convert timestamp string to seconds
function timeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  try {
    const parts = timeStr.split(':');
    const secondsParts = parts[parts.length - 1].split('.');
    const hours = parts.length > 2 ? parseInt(parts[0], 10) : 0;
    const minutes = parts.length > 1 ? parseInt(parts[parts.length - 2], 10) : 0;
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = secondsParts.length > 1 ? parseInt(secondsParts[1].padEnd(3, '0'), 10) : 0;

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  } catch (e) {
    console.error(`Error converting time string "${timeStr}" to seconds:`, e);
    return 0;
  }
}

// Helper function to format seconds back to timestamp
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const wholeSeconds = Math.floor(remainingSeconds);
  const milliseconds = Math.round((remainingSeconds - wholeSeconds) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${wholeSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Modify the POST function to include SRT file generation and passing
export async function POST(request: NextRequest) {
  const tempDir = path.join('/tmp', `video-gen-${uuidv4()}`);
  let srtPath: string | undefined;
  let cleanupDone = false;
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    
    const body = await request.json();
    const {
      youtubeUrl,
      startTime,
      endTime,
      captions,
      title,
      credit,
      aspectRatio = '9:16',
      titleColor = 'white',
      captionFontSize = 48,
      captionColor = 'white',
      creditFontSize = 36,
      creditColor = 'white',
      titleFontFamily = 'Inter-Medium',
      captionFontFamily = 'Roboto-Medium',
      creditsFontFamily = 'Inter-Medium',
      captionStrokeWidth = 0,
      captionStrokeColor = 'black',
      canvasBackgroundColor = 'black',
      titleBold = false,
      titleItalic = false,
      captionBold = false,
      captionItalic = false,
      creditBold = false,
      creditItalic = false
    } = body;

    // Generate SRT file if captions exist
    if (captions && captions.length > 0) {
      srtPath = path.join(tempDir, 'captions.srt');
      const srtContent = generateSrtContent(captions, startTime);
      await fs.writeFile(srtPath, srtContent);
      console.log('SRT file generated:', srtPath);
    }

    const outputPath = path.join(tempDir, 'output.mp4');

    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Call download function with optional SRT path
    const downloadResult = await downloadVideoWithPytubefix(
      youtubeUrl, 
      startTime, 
      endTime, 
      outputPath,
      srtPath  // Pass SRT path if generated
    );

    // Add more detailed logging
    console.log('Video download result:', downloadResult);

    // Return the download result
    return NextResponse.json(downloadResult);
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    // Optional: Add cleanup logic if needed
    if (!cleanupDone) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }
} 