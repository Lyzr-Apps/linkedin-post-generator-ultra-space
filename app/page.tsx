'use client'

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { useAgentActivityStream, ActivityPanel, generateSessionId } from '@/lib/activityStream'
import { copyToClipboard } from '@/lib/clipboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Loader2, Send, Copy, Download, RefreshCw, Check, Sparkles, Image as ImageIcon, FileText } from 'lucide-react'

// LinkedIn Post Generator Agent (Image Output Agent)
const LINKEDIN_POST_GENERATOR_ID = '698c546864884e9215195880'

// Theme colors - Sunset theme
const THEME_VARS = {
  '--background': '30 40% 98%',
  '--foreground': '20 40% 10%',
  '--card': '30 40% 96%',
  '--card-foreground': '20 40% 10%',
  '--popover': '30 40% 96%',
  '--popover-foreground': '20 40% 10%',
  '--primary': '24 95% 53%',
  '--primary-foreground': '30 40% 98%',
  '--secondary': '30 35% 92%',
  '--secondary-foreground': '20 40% 10%',
  '--muted': '30 30% 90%',
  '--muted-foreground': '20 25% 45%',
  '--accent': '12 80% 50%',
  '--accent-foreground': '30 40% 98%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '30 40% 98%',
  '--border': '30 35% 88%',
  '--input': '30 30% 80%',
  '--ring': '24 95% 53%',
  '--radius': '0.875rem',
} as React.CSSProperties

// TypeScript interfaces for LinkedIn Post Generator response
interface LinkedInPostGeneratorResponse {
  status: string
  result: {
    summary?: string
    post_text?: string
    hashtags?: string[]
    word_count?: number
    tone_used?: string
    image_description?: string
    engagement_tips?: string[]
    text?: string
  }
  message?: string
  module_outputs?: {
    artifact_files?: Array<{
      file_url: string
      name?: string
      format_type?: string
    }>
  }
}

const TONES = ['Professional', 'Inspirational', 'Educational', 'Conversational', 'Bold']
const POST_LENGTHS = ['Short', 'Medium', 'Long']

const LINKEDIN_CHAR_LIMIT = 3000

// Sample data for demonstration
const SAMPLE_TOPIC = "Launching my new AI-powered productivity tool for remote teams that helps automate daily standup meetings, track project progress, and generate insights from team communication patterns."
const SAMPLE_KEY_POINTS = "- Automates daily standups\n- Tracks project milestones\n- Generates team insights\n- Integrates with Slack and Teams"
const SAMPLE_POST = "Today marks a milestone in my journey—I'm thrilled to announce the launch of my new AI-powered productivity tool designed specifically for remote teams!\n\nWhen the world shifted to remote work, collaboration and productivity found new challenges. I saw talented teams struggle to stay aligned and organized, even as they worked tirelessly from different corners of the globe. This sparked a vision—to create an AI tool that not only streamlines workflows but truly *empowers* teams to reach their highest potential, no matter where they are.\n\nOur tool leverages the latest in artificial intelligence to automate repetitive tasks, surface insights from daily communications, and foster seamless collaboration. The goal? To give every team member more time for what matters: creative problem-solving, meaningful connections, and delivering results.\n\nI believe the future of work is not just remote, but *connected, intelligent, and human-centric*. With the right technology, we can make distributed teamwork more effective—and more fulfilling—than ever before.\n\nI'd love to hear from you:\nHow do you see AI changing the way your team works? What features would make a real difference for you?\n\nLet's start a conversation and redefine productivity together.\n\n#AI #RemoteWork #Productivity #Innovation #FutureOfWork"
const SAMPLE_IMAGE_URL = "https://url-shortner.studio.lyzr.ai/87e71c4e"

function ToneSelector({ selected, onSelect }: { selected: string; onSelect: (tone: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TONES.map((tone) => (
        <button
          key={tone}
          onClick={() => onSelect(tone)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            selected === tone
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105'
              : 'bg-secondary/50 text-foreground hover:bg-secondary hover:scale-105'
          }`}
        >
          {tone}
        </button>
      ))}
    </div>
  )
}

function PostLengthSelector({ selected, onSelect }: { selected: string; onSelect: (length: string) => void }) {
  return (
    <div className="flex gap-2">
      {POST_LENGTHS.map((length) => (
        <button
          key={length}
          onClick={() => onSelect(length)}
          className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            selected === length
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'bg-secondary/50 text-foreground hover:bg-secondary'
          }`}
        >
          {length}
        </button>
      ))}
    </div>
  )
}

function PostPreview({ text, onCopy }: { text: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Render text with hashtags highlighted
  const renderTextWithHashtags = (content: string) => {
    const parts = content.split(/(\#\w+)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('#')) {
        return (
          <span key={idx} className="text-accent font-semibold">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCopy}
          className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-md"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed pt-8">
        {renderTextWithHashtags(text)}
      </div>
    </div>
  )
}

export default function Home() {
  const [topic, setTopic] = useState('')
  const [keyPoints, setKeyPoints] = useState('')
  const [selectedTone, setSelectedTone] = useState('Professional')
  const [selectedLength, setSelectedLength] = useState('Medium')
  const [includeImage, setIncludeImage] = useState(true)
  const [generatedPost, setGeneratedPost] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageDescription, setImageDescription] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [useSampleData, setUseSampleData] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')

  const { events, isConnected, status: streamStatus, connect, disconnect } = useAgentActivityStream()

  // Apply sample data when toggle is on
  useEffect(() => {
    if (useSampleData) {
      setTopic(SAMPLE_TOPIC)
      setKeyPoints(SAMPLE_KEY_POINTS)
      setSelectedTone('Inspirational')
      setSelectedLength('Medium')
      setIncludeImage(true)
      setGeneratedPost(SAMPLE_POST)
      setGeneratedImage(SAMPLE_IMAGE_URL)
      setImageDescription('Abstract visual representing AI-powered productivity for remote teams—dynamic interconnected shapes, vibrant energy flows symbolizing collaboration, innovation, and digital progress.')
      setImageError(false)
    } else {
      setTopic('')
      setKeyPoints('')
      setSelectedTone('Professional')
      setSelectedLength('Medium')
      setIncludeImage(true)
      setGeneratedPost(null)
      setGeneratedImage(null)
      setImageDescription(null)
      setImageError(false)
    }
  }, [useSampleData])

  const characterCount = generatedPost ? generatedPost.length : 0
  const isOverLimit = characterCount > LINKEDIN_CHAR_LIMIT

  const handleGenerate = async () => {
    if (!topic.trim()) return

    setIsGenerating(true)
    setGeneratedPost(null)
    setGeneratedImage(null)
    setImageDescription(null)
    setImageError(false)

    try {
      // Generate session ID and connect to activity stream
      const newSessionId = generateSessionId(LINKEDIN_POST_GENERATOR_ID)
      setSessionId(newSessionId)
      connect(newSessionId)

      // Build prompt with all parameters
      let message = `Create a LinkedIn post about: ${topic}.`
      if (keyPoints.trim()) {
        message += ` Key points to include: ${keyPoints}.`
      }
      message += ` Tone: ${selectedTone}. Length: ${selectedLength}.`
      if (includeImage) {
        message += ` Include a professional image.`
      }

      const result = await callAIAgent(message, LINKEDIN_POST_GENERATOR_ID, {
        session_id: newSessionId
      })

      if (result.success && result.response) {
        const data = result.response as LinkedInPostGeneratorResponse

        // Extract post text - try multiple possible locations
        const postText = data?.result?.post_text ?? data?.result?.text ?? data?.message ?? ''

        // Strip inline markdown images from text
        const cleanText = postText.replace(/!\[.*?\]\(.*?\)/g, '').trim()
        setGeneratedPost(cleanText)

        // Extract image from module_outputs (top level, not inside result)
        const files = Array.isArray(result?.module_outputs?.artifact_files)
          ? result.module_outputs.artifact_files
          : []

        if (files.length > 0 && files[0]?.file_url) {
          setGeneratedImage(files[0].file_url)
          setImageDescription(files[0].name || data?.result?.image_description || 'Generated LinkedIn image')
        }
      }
    } catch (error) {
      console.error('Content generation failed:', error)
    } finally {
      setIsGenerating(false)
      setTimeout(() => disconnect(), 2000)
    }
  }

  const handleRegeneratePost = async () => {
    if (!topic.trim()) return

    setIsGenerating(true)
    setGeneratedPost(null)

    try {
      let message = `Create a LinkedIn post about: ${topic}.`
      if (keyPoints.trim()) {
        message += ` Key points: ${keyPoints}.`
      }
      message += ` Tone: ${selectedTone}. Length: ${selectedLength}.`

      const result = await callAIAgent(message, LINKEDIN_POST_GENERATOR_ID)

      if (result.success && result.response) {
        const data = result.response as LinkedInPostGeneratorResponse
        const postText = data?.result?.post_text ?? data?.result?.text ?? data?.message ?? ''
        const cleanText = postText.replace(/!\[.*?\]\(.*?\)/g, '').trim()
        setGeneratedPost(cleanText)
      }
    } catch (error) {
      console.error('Post regeneration failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyPost = () => {
    if (generatedPost) {
      copyToClipboard(generatedPost)
    }
  }

  const handleDownloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a')
      link.href = generatedImage
      link.download = 'linkedin-image.png'
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div style={THEME_VARS} className="min-h-screen bg-gradient-to-br from-[hsl(30,50%,97%)] via-[hsl(20,45%,95%)] to-[hsl(40,40%,96%)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              LinkedIn Post Generator
            </h1>
            <p className="text-muted-foreground text-sm">
              Create engaging LinkedIn posts with AI-generated images in seconds
            </p>
          </div>

          {/* Sample Data Toggle */}
          <div className="flex items-center gap-3 bg-card/80 backdrop-blur-lg px-4 py-2 rounded-xl border border-border/50 shadow-sm">
            <span className="text-sm font-medium text-foreground">Sample Data</span>
            <button
              onClick={() => setUseSampleData(!useSampleData)}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                useSampleData ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                  useSampleData ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Two-column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Input Controls (40%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Topic Input */}
            <Card className="bg-card/80 backdrop-blur-lg border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Post Topic
                </CardTitle>
                <CardDescription>What do you want to post about?</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Announcing my startup launch, sharing industry insights, celebrating a team milestone..."
                  className="min-h-[120px] bg-background/50 border-border resize-none text-sm"
                  disabled={isGenerating}
                />
              </CardContent>
            </Card>

            {/* Key Points Input */}
            <Card className="bg-card/80 backdrop-blur-lg border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Key Points (Optional)</CardTitle>
                <CardDescription>Add bullet points or highlights to include</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  placeholder="- Point 1&#10;- Point 2&#10;- Point 3"
                  className="min-h-[100px] bg-background/50 border-border resize-none text-sm font-mono"
                  disabled={isGenerating}
                />
              </CardContent>
            </Card>

            {/* Tone Selector */}
            <Card className="bg-card/80 backdrop-blur-lg border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Tone</CardTitle>
                <CardDescription>Select the tone for your post</CardDescription>
              </CardHeader>
              <CardContent>
                <ToneSelector selected={selectedTone} onSelect={setSelectedTone} />
              </CardContent>
            </Card>

            {/* Post Length Selector */}
            <Card className="bg-card/80 backdrop-blur-lg border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Post Length</CardTitle>
                <CardDescription>Choose your preferred length</CardDescription>
              </CardHeader>
              <CardContent>
                <PostLengthSelector selected={selectedLength} onSelect={setSelectedLength} />
              </CardContent>
            </Card>

            {/* Include Image Toggle */}
            <Card className="bg-card/80 backdrop-blur-lg border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Include Image
                </CardTitle>
                <CardDescription>Generate an AI-powered visual for your post</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIncludeImage(!includeImage)}
                    disabled={isGenerating}
                    className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                      includeImage ? 'bg-primary' : 'bg-muted'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                        includeImage ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-foreground">
                    {includeImage ? 'Image enabled' : 'Image disabled'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!topic.trim() || isGenerating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 h-12 text-base font-semibold transition-all duration-200 hover:scale-105"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Post...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Generate Post
                </>
              )}
            </Button>

            {/* Agent Status */}
            {isGenerating && (
              <Card className="bg-accent/10 backdrop-blur-lg border-accent/30 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        LinkedIn Post Generator
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Creating your post and image...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activity Stream */}
            {isConnected && events.length > 0 && (
              <Card className="bg-card/80 backdrop-blur-lg border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Activity Stream
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ActivityPanel
                    events={events}
                    activeAgent="LinkedIn Post Generator"
                    status={streamStatus}
                    isConnected={isConnected}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Preview Area (60%) */}
          <div className="lg:col-span-3">
            <Card className="bg-card/80 backdrop-blur-lg border-border/50 shadow-xl h-full">
              <CardHeader>
                <CardTitle className="text-lg">Post Preview</CardTitle>
                <CardDescription>
                  {generatedPost || generatedImage
                    ? 'Your LinkedIn content is ready to publish'
                    : 'Generated content will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  {!generatedPost && !generatedImage && (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Sparkles className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Ready to Create
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Enter your topic, configure your preferences, then click Generate Post to create
                        professional LinkedIn content with AI-generated visuals.
                      </p>
                    </div>
                  )}

                  {(generatedPost || generatedImage) && (
                    <div className="space-y-6">
                      {/* Generated Image */}
                      {generatedImage && !imageError && (
                        <div className="space-y-3">
                          <div className="relative overflow-hidden rounded-2xl bg-muted/30">
                            <img
                              src={generatedImage}
                              alt={imageDescription || 'Generated LinkedIn image'}
                              className="w-full h-auto object-cover"
                              style={{ aspectRatio: '1200/627' }}
                              onError={() => setImageError(true)}
                            />
                          </div>
                          {imageDescription && (
                            <p className="text-xs text-muted-foreground italic">{imageDescription}</p>
                          )}
                        </div>
                      )}

                      {generatedImage && imageError && (
                        <div className="p-8 bg-muted/20 rounded-2xl border border-border/50 text-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">Image failed to load</p>
                        </div>
                      )}

                      {generatedImage && <Separator />}

                      {/* Generated Post */}
                      {generatedPost && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">Post Text</h3>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isOverLimit ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {characterCount} / {LINKEDIN_CHAR_LIMIT}
                              </Badge>
                            </div>
                          </div>

                          <div className="bg-background/50 rounded-xl p-4 border border-border/50">
                            <PostPreview text={generatedPost} onCopy={handleCopyPost} />
                          </div>

                          {isOverLimit && (
                            <p className="text-xs text-destructive">
                              Post exceeds LinkedIn's character limit. Consider regenerating with a shorter topic.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {(generatedPost || generatedImage) && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 gap-3">
                            {generatedPost && (
                              <Button
                                onClick={handleCopyPost}
                                variant="secondary"
                                className="w-full"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Text
                              </Button>
                            )}
                            {generatedImage && !imageError && (
                              <Button
                                onClick={handleDownloadImage}
                                variant="secondary"
                                className="w-full"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Image
                              </Button>
                            )}
                            {generatedPost && (
                              <Button
                                onClick={handleRegeneratePost}
                                variant="secondary"
                                className="w-full"
                                disabled={isGenerating || !topic.trim()}
                              >
                                {isGenerating ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Regenerating...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Regenerate Post
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Agent Info Footer */}
        <Card className="mt-6 bg-card/60 backdrop-blur-sm border-border/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span>LinkedIn Post Generator Agent (ID: {LINKEDIN_POST_GENERATOR_ID.substring(0, 12)}...)</span>
              </div>
              <span>Powered by Lyzr AI Agents</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
