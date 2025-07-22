<goal>
Investigate and fix: Captions don't show up in video
</goal>
<task>
- captions are succesfully generated
- captions are visible in clip preview 
- captions don't show up in output video, just the title and credits
</task>
<logs>
bun dev
$ bun run --bun next dev --turbopack
   ▲ Next.js 15.3.5 (Turbopack)
   - Local:        http://localhost:3000
   - Network:      http://127.0.2.2:3000
   - Environments: .env

 ✓ Starting...
 ✓ Ready in 710ms
 ✓ Compiled /api/transcribe in 433ms
Received transcribe request: {
  youtubeUrl: "https://www.youtube.com/watch?v=AHMEtNAZTP4",
  startTime: 0,
  endTime: 10,
}
Sending request to Gemini API...
Received response from Gemini API.
Generated 11 captions with adjusted timestamps.
Sample timing: First caption starts at 00:00:00.605, clip starts at 0s
 POST /api/transcribe 200 in 36812ms
 ✓ Compiled /api/generate-video in 283ms
Using ffmpeg at /opt/homebrew/bin/ffmpeg
Video generation request: {
  title: "Panchayat Funny Moment",
  credit: "@primevideoin",
  youtubeUrl: "https://www.youtube.com/watch?v=AHMEtNAZTP4",
  startTime: 0,
  endTime: 10,
  aspectRatio: "9:16",
}
Original captions: 11, Valid captions: 11
Clip duration: 10s, Start offset: 0s
SRT file created: /tmp/video-gen-2e2385ce-9518-4652-a6ca-6368702f47db/captions.srt
SRT content preview: 1
00:00:00,605 --> 00:00:01,375
इलेक्शन है

2
00:00:02,195 --> 00:00:02,775
कोई भी जीत

3
00:00:02,875 --> 00:00:03,265
सकता है।

4
00:00:03,955 --> 00:00:04,705
अगर मम्मी हार

5
00:00:04,775 --> 00:0...
Generating title image: Panchayat Funny Moment
Attempting to load font: Inter-Medium
Font Inter-Medium found locally and valid.
Successfully registered font: Inter-Medium
Generating credit image: @primevideoin
Attempting to load font: Inter-Medium
Font Inter-Medium found locally and valid.
Successfully registered font: Inter-Medium
Starting video download using pytubefix in 1080p...
Calling Python script: python3 /Users/aayushchaudhary/git/altrd/clip-edit-tool/scripts/download_video.py "https://www.youtube.com/watch?v=AHMEtNAZTP4" 0 10 "/tmp/video-gen-2e2385ce-9518-4652-a6ca-6368702f47db/downloaded_video.mp4"
Video downloaded successfully in 1080p quality
Verifying downloaded video has audio...
Downloaded video analysis: Video=true, Audio=true
Starting FFmpeg processing...
FFmpeg filter chain: [0:v]scale=1080:1920,setsar=1[processed_video_base];color=c=000000:s=1080x1920:d=10[bg];[processed_video_base]subtitles='/tmp/video-gen-2e2385ce-9518-4652-a6ca-6368702f47db/captions.srt':force_style='FontName=Roboto-Medium,FontSize=40,PrimaryColour=&HFFFFFF,BorderStyle=3,OutlineColour=&H000000,Outline=0,Alignment=2,MarginV=960'[processed_video_with_subs];[bg][processed_video_with_subs]overlay=(W-w)/2:0[base];[base][1:v]overlay=180:96[with_title];[with_title][2:v]overlay=180:1628[final_video];[0:a]acopy[final_audio]
FFmpeg command started: ffmpeg -i /tmp/video-gen-2e2385ce-9518-4652-a6ca-6368702f47db/downloaded_video.mp4 -i /tmp/video-gen-2e2385ce-9518-4652-a6ca-6368702f47db/title.png -i /tmp/video-gen-2e2385ce-9518-4652-a6ca-6368702f47db/credit.png -y -filter_complex [0:v]scale=1080:1920,setsar=1[processed_video_base];color=c=000000:s=1080x1920:d=10[bg];[processed_video_base]subtitles='/tmp/video-gen-2e2385ce-9518-4652-a6ca-6368702f47db/captions.srt':force_style='FontName=Roboto-Medium,FontSize=40,PrimaryColour=&HFFFFFF,BorderStyle=3,OutlineColour=&H000000,Outline=0,Alignment=2,MarginV=960'[processed_video_with_subs];[bg][processed_video_with_subs]overlay=(W-w)/2:0[base];[base][1:v]overlay=180:96[with_title];[with_title][2:v]overlay=180:1628[final_video];[0:a]acopy[final_audio] -map [final_video] -map [final_audio] -c:a aac -c:v libx264 -f mp4 /Users/aayushchaudhary/git/altrd/clip-edit-tool/public/videos/final-1ee985f4-f5a2-4ea2-be30-a04c631de01e.mp4
FFmpeg progress: NaN% done
FFmpeg progress: 6% done
FFmpeg progress: 12.8% done
FFmpeg progress: 22.400000000000002% done
FFmpeg progress: 31.2% done
FFmpeg progress: 42.400000000000006% done
FFmpeg progress: 52.800000000000004% done
FFmpeg progress: 63.6% done
FFmpeg progress: NaN% done
FFmpeg progress: NaN% done
FFmpeg progress: 99.2% done
FFmpeg processing completed successfully
Video generation completed: final-1ee985f4-f5a2-4ea2-be30-a04c631de01e.mp4
 POST /api/generate-video 200 in 37918ms
</logs>
