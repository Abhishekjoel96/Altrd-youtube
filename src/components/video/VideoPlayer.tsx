"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Volume2, Maximize2 } from "lucide-react";
import { SavedClip } from "@/app/page";
import { ClipSettings } from "./types";
import { formatTime, timeToSeconds } from "./utils";
import { VideoControls } from "./VideoControls";

interface VideoPlayerProps {
  clip: SavedClip;
  settings: ClipSettings;
  onSettingsChange: (updates: Partial<ClipSettings>) => void;
}

// Helper function to convert font names for CSS
const getFontDisplayName = (fontName: string): string => {
  const fontMap: Record<string, string> = {
    'Inter-Medium': 'Inter, sans-serif',
    'Roboto-Medium': 'Roboto, sans-serif',
    'NotoSans-Regular': '"Noto Sans", sans-serif',
    'LibreFranklin-Regular': '"Libre Franklin", sans-serif',
    'Manrope-Bold': 'Manrope, sans-serif',
    'Manrope-Medium': 'Manrope, sans-serif',
    'Poppins-Regular': 'Poppins, sans-serif',
    'Spectral-Bold': 'Spectral, serif',
    'TrebuchetMS-Italic': '"Trebuchet MS", sans-serif',
  };
  return fontMap[fontName] || fontName?.replace('-', ' ') || 'Inter, sans-serif';
};

// Helper function to load Google Fonts
const loadGoogleFont = (fontFamily: string) => {
  const fontName = fontFamily.split('-')[0]; // Get base font name
  if (fontName && !document.querySelector(`link[href*="${fontName}"]`)) {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
};

// Helper function to get aspect ratio CSS value
const getAspectRatio = (aspectRatio: string): string => {
  switch (aspectRatio) {
    case "16:9":
      return "16/9";
    case "1:1":
      return "1/1";
    case "4:5":
      return "4/5";
    case "3:4":
      return "3/4";
    case "9:16":
    default:
      return "9/16";
  }
};

// Helper function to get container width based on aspect ratio
const getContainerWidth = (aspectRatio: string): string => {
  switch (aspectRatio) {
    case "16:9":
      return "100%"; // Full width for horizontal
    case "1:1":
      return "400px"; // Square
    case "4:5":
      return "320px"; // Portrait
    case "3:4":
      return "300px"; // Portrait
    case "9:16":
    default:
      return "auto"; // Original behavior
  }
};

// Helper function to get max width based on aspect ratio
const getMaxWidth = (aspectRatio: string): string => {
  switch (aspectRatio) {
    case "16:9":
      return "800px"; // Wider for horizontal
    case "1:1":
      return "400px"; // Square
    case "4:5":
      return "320px"; // Portrait
    case "3:4":
      return "300px"; // Portrait  
    case "9:16":
    default:
      return "400px"; // Original behavior
  }
};

// Helper function to get canvas dimensions
const getCanvasDimensions = (aspectRatio: string): { width: number; height: number } => {
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
};

export function VideoPlayer({ clip, settings, onSettingsChange }: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [apiReady, setApiReady] = useState(false);
  const timeUpdateRef = useRef<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerCurrentTime, setPlayerCurrentTime] = useState(clip.start);
  const [mounted, setMounted] = useState(false);
  const [activeCaption, setActiveCaption] = useState('');
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  
  // Use a ref to check if we're currently handling seeking to avoid circular updates
  const isSeeking = useRef(false);
  
  // Get canvas dimensions for positioning
  const canvasDimensions = getCanvasDimensions(settings.aspectRatio);
  
  // Extract playback settings to separate object
  const playbackSettings = {
    isPlaying: settings.isPlaying,
    currentTime: settings.currentTime
  };
  
  // Extract appearance settings to separate object with fixed values
  const appearanceSettings = {
    aspectRatio: settings.aspectRatio,
    xPosition: 50, // Fixed center position
    yPosition: 50, // Fixed center position
    zoomLevel: 100  // Fixed default zoom (100%)
  };

  // Only initialize on the client side
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check if API is already loaded
    if (window.YT) {
      setApiReady(true);
      initializePlayer();
      return;
    }

    // Load YouTube API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Define the callback
    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
      initializePlayer();
    };

    return () => {
      if (timeUpdateRef.current) {
        cancelAnimationFrame(timeUpdateRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying player:", e);
        }
      }
    };
  }, [clip.id, mounted]);

  // Re-initialize player when clip changes
  useEffect(() => {
    if (apiReady && mounted) {
      initializePlayer();
    }
  }, [clip.videoId, clip.start, clip.end, mounted]);

  // Handle time updates
  useEffect(() => {
    let frameId: number | null = null;

    const updateTime = () => {
      if (!playerRef.current || !playerReady || isSeeking.current) return;

      try {
        const time = playerRef.current.getCurrentTime();
        if (!isNaN(time)) {
          setPlayerCurrentTime(time);
          
          // Only update the settings time if it's significantly different (to reduce updates)
          if (Math.abs(time - playbackSettings.currentTime) > 0.5) {
            // Only update currentTime, not aspectRatio
            onSettingsChange({
              currentTime: time,
            });
          }

          // Find and set the active caption with improved timing accuracy
          const currentCaption = clip.captions?.find(c => {
            const startTime = timeToSeconds(c.start);
            const endTime = timeToSeconds(c.end);
            // Add small tolerance for better synchronization (100ms)
            const tolerance = 0.1;
            return time >= (startTime - tolerance) && time <= (endTime + tolerance);
          });
          
          // Only update if caption has changed to avoid unnecessary re-renders
          const newCaption = currentCaption?.text || '';
          if (newCaption !== activeCaption) {
            setActiveCaption(newCaption);
          }
        }

        if (time >= clip.end) {
          // Directly apply the reset logic here to avoid dependency issues
          playerRef.current.seekTo(clip.start, true);
          playerRef.current.pauseVideo();
          setPlayerCurrentTime(clip.start);
          onSettingsChange({ 
            isPlaying: false, 
            currentTime: clip.start,
          });
          return;
        }

        if (playbackSettings.isPlaying) {
          frameId = requestAnimationFrame(updateTime);
        }
      } catch (e) {
        console.error("Error updating time:", e);
      }
    };

    if (playbackSettings.isPlaying && playerReady) {
      frameId = requestAnimationFrame(updateTime);
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [playbackSettings.isPlaying, playerReady, clip.end, clip.start, settings]);

  // Load fonts when settings change
  useEffect(() => {
    if (settings.titleFontFamily) loadGoogleFont(settings.titleFontFamily);
    if (settings.captionFontFamily) loadGoogleFont(settings.captionFontFamily);
    if (settings.creditsFontFamily) loadGoogleFont(settings.creditsFontFamily);
  }, [settings.titleFontFamily, settings.captionFontFamily, settings.creditsFontFamily]);

  const initializePlayer = () => {
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        console.error("Error destroying player:", e);
      }
      playerRef.current = null;
    }

    const container = document.getElementById(`player-${clip.id}`);
    if (!container) return;

    playerRef.current = new window.YT.Player(`player-${clip.id}`, {
      videoId: clip.videoId,
      playerVars: {
        controls: 0,
        disablekb: 1,
        modestbranding: 1,
        rel: 0,
        autoplay: 0,
        enablejsapi: 1,
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
          const iframe = playerRef.current.getIframe();
          if (iframe) {
            iframe.style.opacity = '1';
          }
          // Seek to start time when player is ready
          playerRef.current.seekTo(clip.start, true);
          setPlayerCurrentTime(clip.start);
          // Remove settings initialization as it may override existing settings
        },
        onStateChange: (event: any) => {
          const isPlaying = event.data === window.YT.PlayerState.PLAYING;
          // Only update isPlaying to preserve other settings
          onSettingsChange({
            isPlaying,
          });
        },
      },
    });
  };

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    
    const newIsPlaying = !playbackSettings.isPlaying;
    
    if (newIsPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
    
    // Only update isPlaying, not aspectRatio
    onSettingsChange({ 
      isPlaying: newIsPlaying,
    });
  }, [playerReady, playbackSettings.isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (!playerRef.current || !playerReady) return;
    
    isSeeking.current = true;
    playerRef.current.seekTo(time, true);
    setPlayerCurrentTime(time);
    
    // Only update currentTime, not aspectRatio
    onSettingsChange({
      currentTime: time,
    });
    
    // Reset the seeking flag after a short delay
    setTimeout(() => {
      isSeeking.current = false;
    }, 100);
  }, [playerReady]);

  const handleReset = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    
    isSeeking.current = true;
    playerRef.current.seekTo(clip.start, true);
    playerRef.current.pauseVideo();
    setPlayerCurrentTime(clip.start);
    
    // Only update isPlaying and currentTime, not aspectRatio
    onSettingsChange({ 
      isPlaying: false, 
      currentTime: clip.start,
    });
    
    // Reset the seeking flag after a short delay
    setTimeout(() => {
      isSeeking.current = false;
    }, 100);
  }, [clip.start, playerReady]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!playerRef.current || !playerReady) return;
    
    setVolume(newVolume);
    if (newVolume > 0) {
      setIsMuted(false);
      playerRef.current.unMute();
    }
    playerRef.current.setVolume(newVolume);
  }, [playerReady]);

  const handleMuteToggle = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (newMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unMute();
    }
  }, [isMuted, playerReady]);

  // Calculate progress with safety checks
  const duration = Math.max(0.1, clip.end - clip.start);
  const clampedTime = Math.max(clip.start, Math.min(clip.end, playerCurrentTime));
  const progress = Math.max(0, Math.min(100, ((clampedTime - clip.start) / duration) * 100));
  
  const formattedCurrentTime = formatTime(clampedTime);
  const formattedEndTime = formatTime(clip.end);

  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="relative bg-black rounded-lg overflow-hidden"
            style={{
              maxWidth: getMaxWidth(settings.aspectRatio || "9:16"),
              width: getContainerWidth(settings.aspectRatio || "9:16"),
              margin: 0,
              aspectRatio: getAspectRatio(settings.aspectRatio || "9:16"),
            }}>
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Video Preview Container */}
      <div className="relative">
        {/* Aspect Ratio Container */}
        <div
          className="relative mx-auto bg-black rounded-lg overflow-hidden"
          style={{
            aspectRatio: getAspectRatio(settings.aspectRatio || "9:16"),
            maxWidth: getMaxWidth(settings.aspectRatio || "9:16"),
            width: getContainerWidth(settings.aspectRatio || "9:16"),
            maxHeight: '600px',
            backgroundColor: settings.canvasBackgroundColor || '#000000',
          }}
        >
          {/* Title Overlay - Manual Positioning */}
          {settings.topText && settings.titlePosition && (
            <div 
              className="absolute px-2 z-10 text-center"
              style={{
                left: `${(settings.titlePosition.x / canvasDimensions.width) * 100}%`,
                top: `${(settings.titlePosition.y / canvasDimensions.height) * 100}%`,
                width: `${(settings.titlePosition.width / canvasDimensions.width) * 100}%`,
                height: `${(settings.titlePosition.height / canvasDimensions.height) * 100}%`,
                fontFamily: getFontDisplayName(settings.titleFontFamily || 'Inter-Medium'),
                fontSize: `${settings.topTextFontSize * 0.3}px`, // Scale down for preview
                color: settings.topTextColor,
                fontWeight: settings.topTextBold ? 'bold' : 'normal',
                fontStyle: settings.topTextItalic ? 'italic' : 'normal',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {settings.topText}
            </div>
          )}

          <div
            className="relative w-full h-full"
            style={{
              // Use fixed center position with no zoom
              transform: `translate(0%, 0%) scale(1)`,
              transition: 'transform 0.2s ease-out'
            }}
          >
            <div
              id={`player-${clip.id}`}
              className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-300"
            />
            {/* Live Caption Overlay - Manual Positioning */}
            {activeCaption && settings.captionPosition && (
              <div 
                className="absolute px-2 z-10 text-center"
                style={{
                  left: `${(settings.captionPosition.x / canvasDimensions.width) * 100}%`,
                  top: `${(settings.captionPosition.y / canvasDimensions.height) * 100}%`,
                  width: `${(settings.captionPosition.width / canvasDimensions.width) * 100}%`,
                  height: `${(settings.captionPosition.height / canvasDimensions.height) * 100}%`,
                  fontFamily: getFontDisplayName(settings.captionFontFamily || 'Roboto-Medium'),
                  fontSize: `${settings.captionFontSize * 0.6}px`, // Slightly larger for better preview
                  color: settings.captionColor,
                  fontWeight: settings.captionBold ? 'bold' : 'normal',
                  fontStyle: settings.captionItalic ? 'italic' : 'normal',
                  textShadow: settings.captionStrokeWidth 
                    ? `${settings.captionStrokeColor} 1px 1px ${settings.captionStrokeWidth}px, ${settings.captionStrokeColor} -1px -1px ${settings.captionStrokeWidth}px, ${settings.captionStrokeColor} 1px -1px ${settings.captionStrokeWidth}px, ${settings.captionStrokeColor} -1px 1px ${settings.captionStrokeWidth}px`
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {activeCaption}
              </div>
            )}
            {!apiReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Credits Overlay - Manual Positioning */}
          {settings.bottomText && settings.creditPosition && (
            <div 
              className="absolute px-2 z-10"
              style={{
                left: `${(settings.creditPosition.x / canvasDimensions.width) * 100}%`,
                top: `${(settings.creditPosition.y / canvasDimensions.height) * 100}%`,
                width: `${(settings.creditPosition.width / canvasDimensions.width) * 100}%`,
                height: `${(settings.creditPosition.height / canvasDimensions.height) * 100}%`,
                fontFamily: getFontDisplayName(settings.creditsFontFamily || 'LibreFranklin-Regular'),
                fontSize: `${settings.bottomTextFontSize * 0.3}px`, // Scale down for preview
                color: settings.bottomTextColor,
                fontWeight: settings.bottomTextBold ? 'bold' : 'normal',
                fontStyle: settings.bottomTextItalic ? 'italic' : 'normal',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              {settings.bottomText.startsWith('Credit: ') ? settings.bottomText : `Credit: ${settings.bottomText}`}
            </div>
          )}
        </div>
      </div>

      {/* Video Controls */}
      <VideoControls
        isPlaying={settings.isPlaying}
        currentTime={playerCurrentTime}
        startTime={clip.start}
        endTime={clip.end}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
      />
    </div>
  );
} 