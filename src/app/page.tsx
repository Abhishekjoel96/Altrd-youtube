"use client";

import YouTubeClipper from "@/components/YouTubeClipper";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import SavedClips from "@/components/SavedClips";

// Define the SavedClip interface
export interface SavedClip {
  id: string;
  videoId: string;
  title: string;
  start: number;
  end: number;
  thumbnail: string;
  originalUrl: string;
  createdAt: Date;
  captions?: Array<{
    start: string;
    end: string;
    text: string;
  }>;
  // scheduleTime?: Date;
}

export default function Home() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"clipper" | "saved" | "save">("clipper");
  const [savedClips, setSavedClips] = useState<SavedClip[]>([]);
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});

  const handleSaveClip = (clip: SavedClip) => {
    setSavedClips(prev => [...prev, clip]);
  };

  const handleUpdateClip = (clipId: string, updatedData: Partial<SavedClip>) => {
    setSavedClips(prev =>
      prev.map(clip =>
        clip.id === clipId ? { ...clip, ...updatedData } : clip
      )
    );
  };

  const handleSwitchToSaveClips = () => {
    setActiveTab("save");
    // Optional: Add a subtle notification that user was redirected
    setTimeout(() => {
      console.log("Redirected to Save Clips tab after successful video generation");
    }, 100);
  };

  const handleVideoGenerated = (clipId: string, videoUrl: string) => {
    setGeneratedVideos(prev => ({
      ...prev,
      [clipId]: videoUrl,
    }));
  };

  // Get clips that have generated videos
  const clipsWithVideos = savedClips.filter(clip => 
    Object.keys(generatedVideos).includes(clip.id)
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] text-black dark:text-white">
      {/* Header section */}
      <header className="bg-gray-50 dark:bg-[#121212] py-4 px-6 border-b border-gray-200 dark:border-[#333333] flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-[#7C3AED] text-white h-10 w-10 flex items-center justify-center rounded-md mr-2">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">Altrd Youtube Clipper</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 dark:border-[#333333]">
        <div className="flex max-w-4xl mx-auto">
          <button
            onClick={() => setActiveTab("clipper")}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === "clipper"
                ? "border-b-2 border-[#7C3AED] text-[#7C3AED]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            YouTube Clipper
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === "saved"
                ? "border-b-2 border-[#7C3AED] text-[#7C3AED]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            My Clips ({savedClips.length})
          </button>
          <button
            onClick={() => setActiveTab("save")}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === "save"
                ? "border-b-2 border-[#7C3AED] text-[#7C3AED]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Save Clips ({clipsWithVideos.length})
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="p-8">
        {/* Hero section */}
        {!videoLoaded && activeTab === "clipper" && (
          <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-8 mb-8 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Build, share and <span className="text-[#7C3AED]">monetize</span>
            </h2>
            <h3 className="text-4xl font-bold mb-6">YouTube Content</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
              Automated clip generation, shareable links and scheduling for creators.
            </p>
            <Button className="bg-[#7C3AED] text-white hover:bg-[#6B21A8] py-2 px-6">
              Get Started Free
            </Button>
          </div>
        )}

        {/* Active tab content */}
        {activeTab === "clipper" ? (
          <div className={`bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-8 ${videoLoaded ? 'mt-8' : ''}`}>
            {!videoLoaded && (
              <>
                <h2 className="text-2xl font-bold mb-6">YouTube Clipper</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Enter a YouTube video URL, select a time segment, and create clips easily.
                </p>
              </>
            )}
            <YouTubeClipper 
              onVideoLoad={() => setVideoLoaded(true)} 
              onSaveClip={handleSaveClip} 
            />
          </div>
        ) : activeTab === "saved" ? (
          <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-8 mt-8">
            <SavedClips
              clips={savedClips}
              onRemoveClip={(id) => {
              setSavedClips(prev => prev.filter(clip => clip.id !== id));
              }}
              onUpdateClip={handleUpdateClip}
              onSwitchToSaveClips={handleSwitchToSaveClips}
              onVideoGenerated={handleVideoGenerated}
            />
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-8 mt-8">
            <h2 className="text-2xl font-bold mb-6">Generated Videos</h2>
            {clipsWithVideos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No generated videos yet. Go to "My Clips" to generate videos from your saved clips.
                </p>
                <Button 
                  onClick={() => setActiveTab("saved")}
                  className="bg-[#7C3AED] text-white hover:bg-[#6B21A8]"
                >
                  Go to My Clips
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clipsWithVideos.map((clip) => (
                  <div key={clip.id} className="bg-white dark:bg-[#1E1E1E] rounded-lg p-6 border border-gray-200 dark:border-[#333333]">
                    <h3 className="font-semibold mb-2">{clip.title}</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                      <p>Duration: {Math.round(clip.end - clip.start)}s</p>
                      <p>Captions: {clip.captions?.length || 0} segments</p>
                      <p className="text-green-600 dark:text-green-400">✅ Includes title, captions & credits</p>
                    </div>
                    
                    {generatedVideos[clip.id] && (
                      <div className="space-y-4">
                        <video 
                          src={generatedVideos[clip.id]} 
                          controls 
                          className="w-full rounded-lg"
                          style={{ aspectRatio: "9/16", maxHeight: "300px" }}
                        />
                        <div className="flex gap-2">
                          <Button
                            asChild
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <a 
                              href={generatedVideos[clip.id]} 
                              download={`${clip.title}.mp4`}
                            >
                              Download Video
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}${generatedVideos[clip.id]}`);
                              // You could add a toast here for feedback
                            }}
                          >
                            Copy Link
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Video includes burned-in captions, titles, and credits as configured.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
