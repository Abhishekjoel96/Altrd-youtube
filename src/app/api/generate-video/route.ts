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
  outputPath: string
): Promise<{ success: boolean; error?: string; resolution?: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'download_video.py');
    
    console.log(`Calling Python script: python3 ${scriptPath} "${youtubeUrl}" ${startTime} ${endTime} "${outputPath}"`);
    
    // Use UV virtual environment Python
    const venvPython = path.join(process.cwd(), '.venv', 'bin', 'python');
    const pythonCmd = fsSync.existsSync(venvPython) ? venvPython : 'python3';
    
    const python = spawn(pythonCmd, [
      scriptPath,
      youtubeUrl,
      startTime.toString(),
      endTime.toString(),
      outputPath
    ]);

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
      // For horizontal, scale to full width without cropping
      return { crop: '', scale: 'scale=1920:1080' };
    case '1:1':
      // For square, scale to square without cropping
      return { crop: '', scale: 'scale=1080:1080' };
    case '4:5':
      // For 4:5, scale accordingly without cropping
      return { crop: '', scale: 'scale=1080:1350' };
    case '3:4':
      // For 3:4, scale accordingly without cropping
      return { crop: '', scale: 'scale=1080:1440' };
    case '9:16':
    default:
      // For vertical, scale without cropping
      return { crop: '', scale: 'scale=1080:1920' };
  }
}

const generateSrtContent = (captions: Caption[], startTimeOffset: number): string => {
  return captions
    .map((caption, index) => {
      // Convert timestamps to seconds, subtract the start offset, then convert back
      const startSeconds = timeToSeconds(caption.start) - startTimeOffset;
      const endSeconds = timeToSeconds(caption.end) - startTimeOffset;
      
      // Ensure times are not negative
      const adjustedStart = Math.max(0, startSeconds);
      const adjustedEnd = Math.max(0, endSeconds);
      
      const srtStart = formatTimestamp(adjustedStart).replace('.', ',');
      const srtEnd = formatTimestamp(adjustedEnd).replace('.', ',');
      return `${index + 1}\n${srtStart} --> ${srtEnd}\n${caption.text}\n`;
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

export async function POST(request: NextRequest) {
  const tempDir = path.join('/tmp', `video-gen-${uuidv4()}`);
  let cleanupDone = false;
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    
    const body = await request.json();
    const {
      youtubeUrl,
      startTime: rawStartTime,
      endTime: rawEndTime,
      captions,
      title,
      credit,
      aspectRatio = '9:16',
      titleFontSize = 60,
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
      creditItalic = false,
      titlePosition = { x: 180, y: 120, width: 720, height: 200 },
      captionPosition = { x: 180, y: 860, width: 720, height: 200 },
      creditPosition = { x: 180, y: 1600, width: 720, height: 200 },
    } = body;

    // Validate and set default values for startTime and endTime
    const startTime = typeof rawStartTime === 'number' && !isNaN(rawStartTime) && rawStartTime >= 0 ? rawStartTime : 0;
    const endTime = typeof rawEndTime === 'number' && !isNaN(rawEndTime) && rawEndTime > startTime ? rawEndTime : startTime + 30;

    // Validate YouTube URL
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json(
        { error: 'Invalid YouTube URL provided' },
        { status: 400 }
      );
    }

    // Ensure minimum clip duration
    if (endTime - startTime < 1) {
      return NextResponse.json(
        { error: 'Clip duration must be at least 1 second' },
        { status: 400 }
      );
    }

    console.log('Video generation request:', { title, credit, youtubeUrl, startTime, endTime, aspectRatio });

    const publicDir = path.join(process.cwd(), 'public', 'videos');
    await fs.mkdir(publicDir, { recursive: true });

    const finalVideoName = `final-${uuidv4()}.mp4`;
    const outputPath = path.join(publicDir, finalVideoName);
    
    // --- 1. Prepare caption data and generate Text Images ---
    let validatedCaptions: Caption[] = [];
    if (captions && captions.length > 0) {
      // Validate caption timing
      const clipDuration = endTime - startTime;
      validatedCaptions = captions.filter((caption: Caption) => {
        const captionStart = timeToSeconds(caption.start) - startTime;
        const captionEnd = timeToSeconds(caption.end) - startTime;
        return captionStart >= 0 && captionEnd <= clipDuration && captionStart < captionEnd;
      });

      console.log(`Original captions: ${captions.length}, Valid captions: ${validatedCaptions.length}`);
      console.log(`Clip duration: ${clipDuration}s, Start offset: ${startTime}s`);
    }

    // Get canvas dimensions for the selected aspect ratio
    const canvasDimensions = getCanvasDimensions(aspectRatio);

    // Generate title image with custom positioning
    console.log('Generating title image:', title);
    const titleImagePath = path.join(tempDir, 'title.png');
    
    if (!title || title.trim() === '') {
      console.log('Title is empty, creating blank title image');
      // Create a blank transparent image for empty title
      const blankTitleBuffer = await createTextImage({ 
        text: ' ', // Single space to create minimal image
        width: titlePosition.width,
        fontSize: titleFontSize, 
        fontColor: 'transparent', 
        fontFamily: titleFontFamily,
        fontWeight: titleBold ? 'bold' : 'normal',
        fontStyle: titleItalic ? 'italic' : 'normal',
      });
      await fs.writeFile(titleImagePath, blankTitleBuffer);
    } else {
      const titleImageBuffer = await createTextImage({ 
        text: title, 
        width: titlePosition.width, // Use manual positioning width
        fontSize: titleFontSize, 
        fontColor: titleColor, 
        fontFamily: titleFontFamily,
        fontWeight: titleBold ? 'bold' : 'normal',
        fontStyle: titleItalic ? 'italic' : 'normal',
      });
      await fs.writeFile(titleImagePath, titleImageBuffer);
    }

    // Generate credit image with custom positioning
    console.log('Generating credit image:', credit);
    const creditImagePath = path.join(tempDir, 'credit.png');
    
    if (!credit || credit.trim() === '') {
      console.log('Credit is empty, creating blank credit image');
      // Create a blank transparent image for empty credit
      const blankCreditBuffer = await createTextImage({ 
        text: ' ', // Single space to create minimal image
        width: creditPosition.width,
        fontSize: creditFontSize, 
        fontColor: 'transparent', 
        fontFamily: creditsFontFamily,
        textAlign: 'left',
        fontWeight: creditBold ? 'bold' : 'normal',
        fontStyle: creditItalic ? 'italic' : 'normal',
      });
      await fs.writeFile(creditImagePath, blankCreditBuffer);
    } else {
      const creditText = credit.startsWith('Credit: ') ? credit : `Credit: ${credit}`;
      const creditImageBuffer = await createTextImage({ 
        text: creditText, 
        width: creditPosition.width, // Use manual positioning width
        fontSize: creditFontSize, 
        fontColor: creditColor, 
        fontFamily: creditsFontFamily,
        textAlign: 'left', // Credits are left-aligned like in Python
        fontWeight: creditBold ? 'bold' : 'normal',
        fontStyle: creditItalic ? 'italic' : 'normal',
      });
      await fs.writeFile(creditImagePath, creditImageBuffer);
    }

    // Generate caption images for each caption
    const captionImages: Array<{path: string, startTime: number, endTime: number, text: string}> = [];
    if (validatedCaptions.length > 0) {
      console.log('Generating caption images...');
      for (let i = 0; i < validatedCaptions.length; i++) {
        const caption = validatedCaptions[i];
        const captionImagePath = path.join(tempDir, `caption_${i}.png`);
        
        const captionImageBuffer = await createTextImage({ 
          text: caption.text, 
          width: captionPosition.width,
          fontSize: captionFontSize, 
          fontColor: captionColor, 
          fontFamily: captionFontFamily,
          strokeWidth: captionStrokeWidth,
          strokeColor: captionStrokeColor,
          textAlign: 'center',
          fontWeight: captionBold ? 'bold' : 'normal',
          fontStyle: captionItalic ? 'italic' : 'normal',
        });
        await fs.writeFile(captionImagePath, captionImageBuffer);
        
        const startSeconds = timeToSeconds(caption.start) - startTime;
        const endSeconds = timeToSeconds(caption.end) - startTime;
        
        captionImages.push({
          path: captionImagePath,
          startTime: Math.max(0, startSeconds),
          endTime: Math.max(0, endSeconds),
          text: caption.text
        });
      }
      console.log(`Generated ${captionImages.length} caption images`);
    }
    
    // --- 2. Download video using pytubefix ---
    console.log('Starting video download using pytubefix in 1080p...');
    const downloadedVideoPath = path.join(tempDir, 'downloaded_video.mp4');
    
    // Call Python script to download video with pytubefix
    const downloadResult = await downloadVideoWithPytubefix(youtubeUrl, startTime, endTime, downloadedVideoPath);
    
    if (!downloadResult.success) {
      throw new Error(`Video download failed: ${downloadResult.error}`);
    }
    
    console.log(`Video downloaded successfully in ${downloadResult.resolution || 'highest available'} quality`);

    // Verify the downloaded video has audio streams
    console.log('Verifying downloaded video has audio...');
    try {
      const ffprobeResult = await new Promise<string>((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_streams',
          downloadedVideoPath
        ]);
        
        let output = '';
        ffprobe.stdout.on('data', (data) => output += data);
        ffprobe.on('close', (code) => {
          if (code === 0) resolve(output);
          else reject(new Error(`ffprobe failed with code ${code}`));
        });
      });
      
      const streams = JSON.parse(ffprobeResult);
      const hasAudio = streams.streams?.some((stream: any) => stream.codec_type === 'audio');
      const hasVideo = streams.streams?.some((stream: any) => stream.codec_type === 'video');
      
      console.log(`Downloaded video analysis: Video=${hasVideo}, Audio=${hasAudio}`);
      if (!hasAudio) {
        console.warn('WARNING: Downloaded video has no audio stream!');
      }
    } catch (error) {
      console.warn('Could not analyze downloaded video streams:', error);
    }

    // --- 3. Process with FFmpeg using image overlays ---
    console.log('Starting FFmpeg processing...');
    await new Promise<void>((resolve, reject) => {
      const duration = endTime - startTime;
      const videoProcessing = getVideoProcessing(aspectRatio);
      
      // Build filter components separately
      const filters = [];
      
      // 1. Crop and scale video based on aspect ratio
      filters.push(`[0:v]${videoProcessing.scale},setsar=1[processed_video_base]`);
      
      // 2. Create background with custom color and dynamic size
      filters.push(`color=c=${canvasBackgroundColor.replace('#', '')}:s=${canvasDimensions.width}x${canvasDimensions.height}:d=${duration}[bg]`);

      // Calculate video position (centered)
      const videoWidth = parseInt(videoProcessing.scale.split(':')[1]) || canvasDimensions.width;
      const videoHeight = parseInt(videoProcessing.scale.split(':')[1]) || parseInt(videoProcessing.scale.split(':')[0]);
      const videoYPosition = (canvasDimensions.height - videoHeight) / 2;
      
      // Use manual positioning for text elements
      const titleYPosition = titlePosition.y;
      const creditYPosition = creditPosition.y;

      // 3. Overlay video on background first (centered)
      filters.push(`[bg][processed_video_base]overlay=(W-w)/2:${videoYPosition}[base]`);
      
      // 4. Overlay title image with manual positioning
      filters.push(`[base][1:v]overlay=${titlePosition.x}:${titleYPosition}[with_title]`);
      
      // 5. Overlay credit image with manual positioning
      filters.push(`[with_title][2:v]overlay=${creditPosition.x}:${creditYPosition}[with_overlays]`);

      let currentStream = 'with_overlays';

      // 6. Add dynamic caption overlays if they exist
      if (captionImages.length > 0) {
        console.log(`Setting up ${captionImages.length} dynamic caption overlays`);
        
        captionImages.forEach((captionImg, index) => {
          const inputIndex = 3 + index; // Inputs: 0=video, 1=title, 2=credit, 3+=captions
          const nextStream = index === captionImages.length - 1 ? 'final_video' : `with_caption_${index}`;
          
          // Use enable parameter to show caption only during its time window
          const enableCondition = `between(t,${captionImg.startTime},${captionImg.endTime})`;
          filters.push(`[${currentStream}][${inputIndex}:v]overlay=${captionPosition.x}:${captionPosition.y}:enable='${enableCondition}'[${nextStream}]`);
          
          currentStream = nextStream;
        });
      } else {
        filters.push(`[${currentStream}]null[final_video]`);
      }
      
      // 7. Copy audio stream from input 0 (downloaded video)
      filters.push(`[0:a]acopy[final_audio]`);
      
      // Join all filters with semicolons
      const filterchain = filters.join(';');
      
      console.log('FFmpeg filter chain:', filterchain);
      
      const command = ffmpeg()
        .input(downloadedVideoPath) // Input 0: Video (downloaded via pytubefix)
        .input(titleImagePath)  // Input 1: Title Image
        .input(creditImagePath); // Input 2: Credit Image
      
      // Add caption images as inputs
      captionImages.forEach((captionImg) => {
        command.input(captionImg.path);
      });
      
      command
        .complexFilter(filterchain, ['final_video', 'final_audio'])
        .outputOptions([
          '-c:a', 'aac',             // Encode audio as AAC
          '-c:v', 'libx264'          // Encode video as H.264
        ])
        .toFormat('mp4');

      command
        .on('start', (commandLine: string) => {
          console.log('FFmpeg command started:', commandLine);
        })
        .on('progress', (progress: { percent?: number }) => {
          console.log('FFmpeg progress:', progress.percent + '% done');
        })
        .on('end', () => {
          console.log('FFmpeg processing completed successfully');
          resolve();
        })
        .on('error', (err: Error) => {
          console.error('FFmpeg error:', err.message);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .save(outputPath);
    });
    
    console.log('Video generation completed:', finalVideoName);
    
    // Clean up temp directory after successful generation
    cleanupDone = true;
    try { 
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch(err){
      console.error(`Failed to clean up temp directory ${tempDir}:`, err);
    }
    
    return NextResponse.json({
      success: true,
      videoUrl: `/videos/${finalVideoName}`
    });

  } catch (error) {
    console.error('Error generating video:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to generate video', details: errorMessage },
      { status: 500 }
    );
  } finally {
    // Only clean up if we haven't already done so
    if (!cleanupDone && tempDir) {
      try { 
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch(err){
        console.error(`Failed to clean up temp directory ${tempDir}:`, err);
      }
    }
  }
} 