"use client";

import { useState, useEffect } from "react";
import { SavedClip } from "@/app/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trash2, Download } from "lucide-react";
import { VideoPlayer } from "./video/VideoPlayer";
import { VideoSettings } from "./video/VideoSettings";
import { ClipSettings } from "./video/types";
import { formatTime } from "./video/utils";
import { toast } from "sonner";
// import { DateTimePicker } from "./ui/datetime-picker";

interface SavedClipsProps {
  clips: SavedClip[];
  onRemoveClip: (id: string) => void;
}

export default function SavedClips({ clips, onRemoveClip }: SavedClipsProps) {
  const [mounted, setMounted] = useState(false);
  const [clipSettings, setClipSettings] = useState<Record<string, ClipSettings>>({});
  const [clipAspectRatios, setClipAspectRatios] = useState<Record<string, ClipSettings['aspectRatio']>>({});
  const [downloadingClips, setDownloadingClips] = useState<Record<string, boolean>>({});
  // const [clipScheduleTimes, setClipScheduleTimes] = useState<Record<string, Date | null>>({});

  // Only initialize on the client side
  useEffect(() => {
    setMounted(true);
    
    // Initialize settings for all clips
    const initialSettings: Record<string, ClipSettings> = {};
    const initialAspectRatios: Record<string, ClipSettings['aspectRatio']> = {};
    
    clips.forEach(clip => {
      initialSettings[clip.id] = getDefaultSettings();
      initialAspectRatios[clip.id] = 'original';
      // initialScheduleTimes[clip.id] = clip.scheduleTime || null;
    });
    
    setClipSettings(initialSettings);
    setClipAspectRatios(initialAspectRatios);
    // setClipScheduleTimes(initialScheduleTimes);
  }, []);

  // Update aspect ratios and qualities when clips change
  useEffect(() => {
    const updatedAspectRatios: Record<string, ClipSettings['aspectRatio']> = { ...clipAspectRatios };
    
    clips.forEach(clip => {
      if (!updatedAspectRatios[clip.id]) {
        updatedAspectRatios[clip.id] = 'original';
      }
      // if (!updatedScheduleTimes[clip.id]) {
      //   updatedScheduleTimes[clip.id] = clip.scheduleTime || null;
      // }
    });
    
    setClipAspectRatios(updatedAspectRatios);
    // setClipScheduleTimes(updatedScheduleTimes);
  }, [clips]);

  const getDefaultSettings = (): ClipSettings => ({
    aspectRatio: "original",
    quality: "fhd",
    xPosition: 50,
    yPosition: 50,
    zoomLevel: 100,
    isPlaying: false,
    currentTime: 0,
  });

  const getSettings = (clipId: string): ClipSettings => {
    const baseSettings = clipSettings[clipId] || getDefaultSettings();
    // Merge the aspect ratio and quality from separate state
    return {
      ...baseSettings,
      aspectRatio: clipAspectRatios[clipId] || 'original',
      quality: 'fhd', // Hardcode to fhd
    };
  };

  const updateSettings = (clipId: string, updates: Partial<ClipSettings>) => {
    // If the update includes aspectRatio, update that separately
    if (updates.aspectRatio !== undefined) {
      // Remove aspectRatio from updates to avoid duplication
      const { aspectRatio, ...otherUpdates } = updates;
      
      // Only update clipSettings if there are other updates
      if (Object.keys(otherUpdates).length > 0) {
        setClipSettings(prev => ({
          ...prev,
          [clipId]: {
            ...getSettings(clipId),
            ...otherUpdates,
          },
        }));
      }
    } else {
      // No aspectRatio in updates, just update the other settings
      setClipSettings(prev => ({
        ...prev,
        [clipId]: {
          ...getSettings(clipId),
          ...updates,
        },
      }));
    }
  };

  const handleAspectRatioChange = (clipId: string, ratio: ClipSettings['aspectRatio']) => {
    setClipAspectRatios(prev => ({
      ...prev,
      [clipId]: ratio
    }));
  };

  const downloadClip = async (clip: SavedClip) => {
    setDownloadingClips(prev => ({
      ...prev,
      [clip.id]: true
    }));

    try {
      // Get the aspect ratio and quality settings for this clip
      const aspectRatio = clipAspectRatios[clip.id] || 'original';
      const quality = 'fhd'; // Hardcoded
      
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:5001';
      
      const response = await fetch(`${apiUrl}/download-clip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: clip.originalUrl,
          start: clip.start,
          end: clip.end,
          title: clip.title,
          quality: quality,
          aspectRatio: aspectRatio
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success("Clip downloaded successfully!", {
          description: `${data.filename} has been saved to your downloads folder.`,
        });
        
        // Optionally, trigger browser download
        const downloadResponse = await fetch(`${apiUrl}/download-file/${data.filename}`);
        if (downloadResponse.ok) {
          const blob = await downloadResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = data.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        throw new Error(data.error || 'Download failed');
      }
    } catch (error) {
      console.error('Error downloading clip:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Connection failed", {
          description: "Cannot connect to backend server. Please make sure it's running on port 5001.",
        });
      } else {
        toast.error("Failed to download clip", {
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
        });
      }
    } finally {
      setDownloadingClips(prev => ({
        ...prev,
        [clip.id]: false
      }));
    }
  };

  // const handleScheduleTimeChange = (clipId: string, date: Date | null) => {
  //   setClipScheduleTimes(prev => ({
  //     ...prev,
  //     [clipId]: date
  //   }));
  // };



  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return null;
  }

  if (clips.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">My Clips</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You haven't saved any clips yet. Go to the YouTube Clipper tab to create and save clips.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">My Clips</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize and preview your saved clips.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {clips.map((clip) => {
          const settings = getSettings(clip.id);

          return (
            <Card key={clip.id} className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333333]">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg">{clip.title}</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  {formatTime(clip.start)} - {formatTime(clip.end)}
                </CardDescription>
                {/* {clipScheduleTimes[clip.id] && (
                  <div className="mt-1 flex items-center text-[#97D700]">
                    <span className="text-xs">
                      Scheduled: {clipScheduleTimes[clip.id]?.toLocaleDateString()} at {clipScheduleTimes[clip.id]?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                )} */}
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-col gap-6">
                  {mounted && (
                    <>
                      <VideoPlayer 
                        clip={clip} 
                        settings={settings}
                        onSettingsChange={(updates) => updateSettings(clip.id, updates)}
                      />

                      {/* Schedule Time Picker - Removed */}
                      {/* <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Schedule Time
                        </label>
                        <div className="relative">
                          <DateTimePicker
                            selected={clipScheduleTimes[clip.id] || null}
                            onChange={(date) => handleScheduleTimeChange(clip.id, date)}
                            className="bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-[#333333] text-black dark:text-white"
                            placeholder="Select when to publish this clip"
                          />
                          {clipScheduleTimes[clip.id] && (
                            <div className="absolute right-0 top-0 h-2 w-2 translate-x-1/2 -translate-y-1/2">
                              <div className="animate-pulse h-2 w-2 rounded-full bg-[#97D700]"></div>
                            </div>
                          )}
                        </div>
                      </div> */}

                      <VideoSettings
                        clipId={clip.id}
                        settings={settings}
                        onAspectRatioChange={(ratio) => handleAspectRatioChange(clip.id, ratio)}
                        onQualityChange={(quality) => {/* Quality change handler */}}
                      />
                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                  onClick={() => onRemoveClip(clip.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-[#FF6500] text-white border-[#FF6500] hover:bg-[#E55A00] hover:border-[#E55A00]"
                  onClick={() => downloadClip(clip)}
                  disabled={downloadingClips[clip.id]}
                >
                  <Download className="h-4 w-4 mr-1" />
                  {downloadingClips[clip.id] ? "Downloading..." : "Download"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 