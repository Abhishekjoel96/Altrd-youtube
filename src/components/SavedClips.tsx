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
import { Trash2, Save, Edit, Pencil } from "lucide-react";
import { VideoPlayer } from "./video/VideoPlayer";
import { VideoSettings } from "./video/VideoSettings";
import { ClipSettings } from "./video/types";
import { formatTime, formatTimestamp, timeToSeconds } from "./video/utils";
import { toast } from "sonner";
import { WebhookUrlModal } from "./WebhookUrlModal";
import { getWebhookUrl, saveWebhookUrl } from "@/lib/webhookStore";
import { Textarea } from "./ui/textarea";
// import { DateTimePicker } from "./ui/datetime-picker";

interface SavedClipsProps {
  clips: SavedClip[];
  onRemoveClip: (id: string) => void;
  onUpdateClip: (clipId: string, updatedData: Partial<SavedClip>) => void;
  onSwitchToSaveClips?: () => void; // New prop for tab switching
  onVideoGenerated?: (clipId: string, videoUrl: string) => void; // New prop for video tracking
}

export default function SavedClips({ clips, onRemoveClip, onUpdateClip, onSwitchToSaveClips, onVideoGenerated }: SavedClipsProps) {
  const [mounted, setMounted] = useState(false);
  const [clipSettings, setClipSettings] = useState<Record<string, ClipSettings>>({});
  // Aspect ratio is fixed to 9:16 now, so we no longer track it per-clip
  const [isSaving, setIsSaving] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [preset, setPreset] = useState("Custom");
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editedTranscription, setEditedTranscription] = useState<string>('');
  const [generatingClipId, setGeneratingClipId] = useState<string | null>(null);
  const [generatedVideoUrls, setGeneratedVideoUrls] = useState<Record<string, string>>({});

  // Only initialize on the client side
  useEffect(() => {
    setMounted(true);
    
    // Initialize settings for all clips
    const initialSettings: Record<string, ClipSettings> = {};
    
    clips.forEach(clip => {
      initialSettings[clip.id] = getDefaultSettings("9:16"); // Default to 9:16, will be updated when user changes aspect ratio
    });
    
    setClipSettings(initialSettings);
  }, []);



  const getDefaultSettings = (aspectRatio: string = "9:16"): ClipSettings => {
    // Get canvas dimensions for the aspect ratio
    const getCanvasDimensions = (ar: string) => {
      switch (ar) {
        case '16:9': return { width: 1920, height: 1080 };
        case '1:1': return { width: 1080, height: 1080 };
        case '4:5': return { width: 1080, height: 1350 };
        case '3:4': return { width: 1080, height: 1440 };
        case '9:16':
        default: return { width: 1080, height: 1920 };
      }
    };
    
    const canvasDimensions = getCanvasDimensions(aspectRatio);
    const padding = 180; // Horizontal padding
    const elementWidth = canvasDimensions.width - (padding * 2);
    
    return {
      aspectRatio: aspectRatio as any,
    xPosition: 50,
    yPosition: 50,
    zoomLevel: 100,
    isPlaying: false,
    currentTime: 0,
    // Text styling defaults
      topText: "Enter Video Title",
      bottomText: "Enter Credits",
    topTextColor: "#FFFFFF",
    bottomTextColor: "#FFFFFF",
    topTextFontSize: 60,
    bottomTextFontSize: 50,
      titleFontFamily: "Inter-Medium",
      creditsFontFamily: "Inter-Medium",
    canvasBackgroundColor: "#000000",
    topTextBold: false,
    topTextItalic: false,
    bottomTextBold: false,
    bottomTextItalic: false,
    // Caption styling defaults
    captionColor: "#FFFFFF",
    captionFontSize: 40,
      captionFontFamily: "Roboto-Medium",
      captionStrokeWidth: 0,
      captionStrokeColor: "#000000",
    captionBold: false,
    captionItalic: false,
      // Manual positioning defaults - responsive to aspect ratio
      titlePosition: {
        x: padding,
        y: Math.max(60, canvasDimensions.height * 0.05), // 5% from top or minimum 60px
        width: elementWidth,
        height: 200,
      },
      captionPosition: {
        x: padding,
        y: canvasDimensions.height / 2 - 100, // Center vertically
        width: elementWidth,
        height: 200,
      },
      creditPosition: {
        x: padding,
        y: Math.min(canvasDimensions.height - 260, canvasDimensions.height * 0.85), // 85% down or 260px from bottom
        width: elementWidth,
        height: 200,
      },
    };
  };

  const getSettings = (clipId: string): ClipSettings => {
    const baseSettings = clipSettings[clipId] || getDefaultSettings("9:16");
    return baseSettings;
  };

  const updateSettings = (clipId: string, updates: Partial<ClipSettings>) => {
    setClipSettings(prev => {
      const currentSettings = prev[clipId] || getDefaultSettings("9:16");
      
      // If aspect ratio is changing, recalculate default positions
      if (updates.aspectRatio && updates.aspectRatio !== currentSettings.aspectRatio) {
        const newDefaults = getDefaultSettings(updates.aspectRatio);
        return {
          ...prev,
          [clipId]: {
            ...currentSettings,
            ...updates,
            // Update positions to new aspect ratio defaults if they haven't been manually customized
            titlePosition: newDefaults.titlePosition,
            captionPosition: newDefaults.captionPosition,
            creditPosition: newDefaults.creditPosition,
          },
        };
      }
      
      return {
        ...prev,
        [clipId]: {
          ...currentSettings,
          ...updates,
        },
      };
    });
  };



  const handleStartEditing = (clip: SavedClip) => {
    setEditingClipId(clip.id);
    setEditedTranscription(clip.captions?.map(c => c.text).join(' ') || '');
    // Clear generated video URL for this clip when editing starts
    setGeneratedVideoUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[clip.id];
      return newUrls;
    });
  };

  const handleSaveTranscription = (clipId: string) => {
    const originalClip = clips.find(clip => clip.id === clipId);
    if (!originalClip) return;

    const updatedCaptions = [{
      start: originalClip.captions?.[0]?.start || '00:00:00.000',
      end: originalClip.captions?.[originalClip.captions.length - 1]?.end || '',
      text: editedTranscription,
    }];
    
    onUpdateClip(clipId, { captions: updatedCaptions });
    setEditingClipId(null);
  };

  const handleGenerateVideo = async (clip: SavedClip) => {
    setGeneratingClipId(clip.id);
    setGeneratedVideoUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[clip.id];
      return newUrls;
    });
      
    const settings = getSettings(clip.id);
    
    // Standardize caption timestamps relative to clip start
    const standardizeCaptions = (captions?: Array<{start: string, end: string, text: string}>) => {
      if (!captions) return [];
      
      return captions.map(caption => {
        // Convert timestamps to seconds relative to clip start
        const startSeconds = timeToSeconds(caption.start) - clip.start;
        const endSeconds = timeToSeconds(caption.end) - clip.start;
        
        return {
          start: formatTimestamp(Math.max(0, startSeconds)),
          end: formatTimestamp(Math.max(0, endSeconds)),
          text: caption.text
        };
      }).filter(c => c.start !== c.end); // Remove zero-duration captions
    };
    
    const standardizedCaptions = standardizeCaptions(clip.captions);
    
    console.log('Generating video with standardized captions:', {
      title: settings.topText,
      credits: settings.bottomText,
      titleFont: settings.titleFontFamily,
      captionFont: settings.captionFontFamily,
      creditsFont: settings.creditsFontFamily,
      captionCount: standardizedCaptions.length
    });
      
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: clip.originalUrl,
          startTime: clip.start,
          endTime: clip.end,
          captions: standardizedCaptions,
          aspectRatio: settings.aspectRatio,
          title: settings.topText,
          credit: settings.bottomText,
          titleFontFamily: settings.titleFontFamily,
          titleFontSize: settings.topTextFontSize,
          titleColor: settings.topTextColor,
          captionFontFamily: settings.captionFontFamily,
          captionFontSize: settings.captionFontSize,
          captionColor: settings.captionColor,
          creditFontFamily: settings.creditsFontFamily,
          creditFontSize: settings.bottomTextFontSize,
          creditColor: settings.bottomTextColor,
          captionStrokeWidth: settings.captionStrokeWidth,
          captionStrokeColor: settings.captionStrokeColor,
          canvasBackgroundColor: settings.canvasBackgroundColor,
          titleBold: settings.topTextBold,
          titleItalic: settings.topTextItalic,
          captionBold: settings.captionBold,
          captionItalic: settings.captionItalic,
          creditBold: settings.bottomTextBold,
          creditItalic: settings.bottomTextItalic,
          titlePosition: settings.titlePosition,
          captionPosition: settings.captionPosition,
          creditPosition: settings.creditPosition,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to generate video');
      }

      const result = await response.json();
      setGeneratedVideoUrls(prev => ({
          ...prev,
        [clip.id]: result.videoUrl,
      }));
      
      // Notify parent component about the generated video FIRST
      if (onVideoGenerated) {
        onVideoGenerated(clip.id, result.videoUrl);
      }
      
      toast.success('Video generated successfully!', {
        description: 'Video includes title, captions, and credits as shown in preview. Switching to Save Clips tab...',
        duration: 3000,
        });

      // Switch to Save Clips tab immediately after successful generation
      setTimeout(() => {
        if (onSwitchToSaveClips) {
          onSwitchToSaveClips();
        }
      }, 1000);

    } catch (error) {
      console.error('Video generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Video Generation Failed', {
        description: errorMessage,
      });
    } finally {
      setGeneratingClipId(null);
    }
  };

  // Function to handle edit clip (placeholder for now)
  const handleEditClip = (clipId: string) => {
    // For now, just show a toast. In the future, this could open an edit modal
    // or navigate to an edit page
    toast.info("Edit functionality coming soon!", {
      description: `Editing clip: ${clips.find(c => c.id === clipId)?.title}`
    });
  };

  // Function to open the webhook modal
  const openSaveAllClipsModal = () => {
    if (clips.length === 0) {
      toast.error("No clips to save");
      return;
    }
    setIsWebhookModalOpen(true);
  };

  // Function to handle webhook URL submission
  const handleWebhookSubmit = async (url: string) => {
    // Save the webhook URL for future use
    saveWebhookUrl('saveAllClips', url);
    
    // Call the function to save all clips with the provided URL
    await saveAllClipsWithWebhook(url);
  };

  // New function to save all clips with the provided webhook URL
  const saveAllClipsWithWebhook = async (webhookUrl: string) => {
    if (clips.length === 0) {
      toast.error("No clips to save");
      return;
    }

    setIsSaving(true);
    try {
      // Create an array of clip data with their settings
      const clipsData = clips.map(clip => {
        const settings = getSettings(clip.id);
        return {
        start: clip.start,
        end: clip.end,
          aspectRatio: settings.aspectRatio || '9:16', // Use actual clip setting
        youtubeURL: clip.originalUrl,
        videoId: clip.videoId,
        title: clip.title,
          caption: clip.captions?.map(c => c.text).join(' ') || '', // Include caption in the webhook data
        };
      });

      // Call the webhook with all clips data
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clips: clipsData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save clips');
      }

      toast.success("All clips saved successfully", {
        description: `${clips.length} clips have been saved.`
      });
    } catch (error) {
      console.error('Error saving clips:', error);
      toast.error("Failed to save clips", {
        description: "Please check the webhook URL and try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Extended preset logic for captions, title, credits
  const applyPresetToAllClips = (preset: string) => {
    let presetSettings: Partial<ClipSettings> = {};
    
    switch (preset) {
      case "101xFounders":
        presetSettings = {
          titleFontFamily: "Inter-Medium", // Hook: FONTSPRING DEMO - Articulat CF & Inter (medium)
          captionFontFamily: "NotoSans-Regular", // Subtitle: Neue Haas Grotesk Display Pro (65 medium) - using NotoSans as fallback
          creditsFontFamily: "LibreFranklin-Regular", // Credit: Franklin Gothic Book - using LibreFranklin as fallback
          topTextColor: "#F9A21B", // Hook color: F9A21B (orange accent)
          captionColor: "#FFFFFF", // Subt color: FFFFFF
          bottomTextColor: "#FFFFFF", // Credits color
          captionStrokeWidth: 2.0,
          captionStrokeColor: "#000000",
        };
        break;
      case "IndianFoundersco":
        presetSettings = {
          titleFontFamily: "NotoSans-Regular", // Hook: Neue Haas Grotesk Display Pro (65 medium) - using NotoSans as fallback
          captionFontFamily: "NotoSans-Regular", // Subt: Neue Haas Grotesk Display Pro (65 medium) - using NotoSans as fallback
          creditsFontFamily: "LibreFranklin-Regular", // Credit: Franklin Gothic Book - using LibreFranklin as fallback
          topTextColor: "#F2DB2D", // Hook color: F2DB2D (yellow accent)
          captionColor: "#FFFFFF", // Subt color: FFFFFF
          bottomTextColor: "#FFFFFF", // Credits color
          captionStrokeWidth: 5.0,
          captionStrokeColor: "#000000",
        };
        break;
      case "BIP":
        presetSettings = {
          titleFontFamily: "Inter-Medium", // Hook: Articulat CF (Bold) - using Inter as fallback
          captionFontFamily: "NotoSans-Regular", // Subtitle: Neue Haas Grotesk Display Pro - using NotoSans as fallback
          creditsFontFamily: "NotoSans-Regular", // Credit: Ebrima Regular - using NotoSans as fallback
          topTextColor: "#FFF200", // Hook color: FFF200 (bright yellow)
          captionColor: "#FFFFFF", // Subt color: FFFFFF
          bottomTextColor: "#FFFFFF", // Credits color
          captionStrokeWidth: 3.5,
          captionStrokeColor: "#000000",
        };
        break;
      case "Lumen Links":
        presetSettings = {
          titleFontFamily: "Inter-Medium", // Hook: Manrope (Bold/Medium) - using Inter as fallback
          captionFontFamily: "Roboto-Medium", // Subt: Roboto (medium)
          creditsFontFamily: "LibreFranklin-Regular", // Credit: Poppins (regular) - using LibreFranklin as fallback
          topTextColor: "#FFFFFF", // Hook color: White with highlight
          captionColor: "#02D17E", // Subtitle color: 02D17E (green)
          bottomTextColor: "#FFFFFF", // Credits color
          captionStrokeWidth: 2.0,
          captionStrokeColor: "#000000",
        };
        break;
      case "GoodClipsMatter":
        presetSettings = {
          titleFontFamily: "Inter-Medium", // Hook: Onest (Medium) - using Inter as fallback
          captionFontFamily: "Roboto-Medium", // Subt: Trebuchet MS (Italic) - using Roboto as fallback
          creditsFontFamily: "LibreFranklin-Regular", // Credit: Poppins (regular) - using LibreFranklin as fallback
          topTextColor: "#FFFFFF", // Hook color: White
          captionColor: "#FFFFFF", // Subtitle color: FFFFFF
          bottomTextColor: "#FFFFFF", // Credits color
          captionStrokeWidth: 3.0,
          captionStrokeColor: "#000000",
        };
        break;
      case "JabWeWatched":
        presetSettings = {
          titleFontFamily: "NotoSans-Regular", // Hook: Spectral (Bold) - using NotoSans as fallback
          captionFontFamily: "Roboto-Medium", // Subt: Trebuchet MS (Italic) - using Roboto as fallback
          creditsFontFamily: "LibreFranklin-Regular", // Credit: Poppins (regular) - using LibreFranklin as fallback
          topTextColor: "#FFFFFF", // Hook color: White
          captionColor: "#FFFA00", // Subtitle color: FFFA00 (bright yellow)
          bottomTextColor: "#FFFFFF", // Credits color
          captionStrokeWidth: 4.0,
          captionStrokeColor: "#000000",
        };
        break;
      default:
        // Custom or default case
        presetSettings = getDefaultSettings();
        break;
    }

    // For all clips, update settings and set video credits to @Preset Name
    setClipSettings(prev => {
      const updated: Record<string, ClipSettings> = { ...prev };
      Object.keys(updated).forEach(cid => {
        updated[cid] = { ...updated[cid], ...presetSettings };
      });
      return updated;
    });
  };

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
      {/* Webhook URL Modal */}
      <WebhookUrlModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
        onSubmit={handleWebhookSubmit}
        title="Save All Clips Webhook"
        description="Enter the webhook URL to save all clips."
        defaultUrl={getWebhookUrl('saveAllClips')}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">My Clips</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Customize and preview your saved clips.
          </p>
        </div>
        {/* Presets Dropdown for captions/title/credits */}
        <div className="flex items-center gap-2">
          <label className="font-medium">Preset:</label>
          <select
            value={preset}
            onChange={e => {
              setPreset(e.target.value);
              applyPresetToAllClips(e.target.value);
            }}
            className="rounded border px-2 py-1"
          >
            <option value="Custom">Custom</option>
            <option value="101xFounders">101xFounders</option>
            <option value="IndianFoundersco">IndianFoundersco</option>
            <option value="BIP">BIP</option>
            <option value="Lumen Links">Lumen Links</option>
            <option value="GoodClipsMatter">GoodClipsMatter</option>
            <option value="JabWeWatched">JabWeWatched</option>
          </select>
        </div>
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
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/2">
                  {mounted && (
                      <VideoPlayer 
                        clip={clip} 
                        settings={settings}
                        onSettingsChange={(updates) => updateSettings(clip.id, updates)}
                      />
                    )}
                  </div>
                  <div className="w-full md:w-1/2">
                      <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <Pencil className="h-4 w-4 mr-2" /> Auto-Generated Transcription
                          </label>
                        <div className="flex gap-2">
                          {editingClipId === clip.id ? (
                            <Button
                              size="sm"
                              onClick={() => handleSaveTranscription(clip.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEditing(clip)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                            </div>
                      <div className="h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-[#252525] rounded-lg border border-gray-200 dark:border-[#333333]">
                        {editingClipId === clip.id ? (
                          <textarea
                            value={editedTranscription}
                            onChange={(e) => setEditedTranscription(e.target.value)}
                            className="w-full h-full bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-200 leading-relaxed resize-none"
                            autoFocus
                          />
                        ) : (
                          <>
                            {clip.captions && clip.captions.length > 0 ? (
                              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                {clip.captions.map((caption) => caption.text).join(' ')}
                              </p>
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  No transcription available for this clip.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                              </div>
                            </div>
                          </div>
                <div className="flex flex-col gap-6 mt-6">
                  {mounted && (
                    <>
                      <VideoSettings
                        clipId={clip.id}
                        clip={clip}
                        settings={settings}
                        onSettingsChange={(updates) => updateSettings(clip.id, updates)}
                      />

                      {/* Generate Video Button */}
                      <div className="mt-6">
                          <Button
                          onClick={() => handleGenerateVideo(clip)}
                          disabled={generatingClipId === clip.id}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          {generatingClipId === clip.id ? 'Generating Video...' : 'Generate Video with All Elements'}
                          </Button>
                      </div>

                      {/* Display Generated Video */}
                      {generatedVideoUrls[clip.id] && (
                        <div className="mt-4">
                           <h4 className="font-semibold mb-2">Generated Video:</h4>
                           <video src={generatedVideoUrls[clip.id]} controls className="w-full rounded-lg"></video>
                           <a href={generatedVideoUrls[clip.id]} download={`clip-${clip.title}.mp4`} className="text-blue-500 hover:underline mt-2 inline-block">
                             Download Video
                           </a>
                        </div>
                      )}


                    </>
                  )}
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <div className="flex gap-2">
                  {/* Edit button removed as per new requirements */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-500 hover:bg-red-100 dark:hover:bg-red-900"
                    onClick={() => onRemoveClip(clip.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 