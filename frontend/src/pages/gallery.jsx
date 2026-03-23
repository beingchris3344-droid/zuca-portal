import React, { useState, useEffect, useRef } from 'react';
import { api, publicApi } from '../api';
import {
  Heart, Eye, MessageCircle, X, Filter, Image as ImageIcon,
  Video, FileText, User, Clock, Share2, Download, Music2,
  Camera, TrendingUp, Calendar, Award, Star, Zap, Users,
  ChevronLeft, ChevronRight, Search, Grid3x3, LayoutGrid,
  ChevronDown, Play, Pause, Volume2, Maximize2, Minus, Plus,
  ThumbsUp, ThumbsDown, Bookmark, Share, ExternalLink,
  Facebook, Twitter, Instagram, Copy, Check, AlertCircle,
  VolumeX, SkipBack, SkipForward, Repeat, Shuffle, Send,
  ArrowLeft, Sparkles, Compass
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Adaptive Media Player Component (Supports Video & Audio)
const AdaptiveMediaPlayer = ({ src, thumbnailUrl, title, type = 'video', autoPlay = false }) => {
  const mediaRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isAudio, setIsAudio] = useState(type === 'audio');
  const [audioArtwork, setAudioArtwork] = useState(thumbnailUrl || null);
  const controlsTimeoutRef = useRef(null);

  // Detect if it's an audio file by extension or type prop
  useEffect(() => {
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'webm'];
    const fileExtension = src?.split('.').pop()?.toLowerCase();
    const isAudioFile = audioExtensions.includes(fileExtension) || type === 'audio';
    setIsAudio(isAudioFile);
  }, [src, type]);

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && !isAudio) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showControls, isAudio]);

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const current = mediaRef.current.currentTime;
      const dur = mediaRef.current.duration;
      if (dur && !isNaN(dur)) {
        const prog = (current / dur) * 100;
        setProgress(prog);
        setCurrentTime(current);
        setDuration(dur);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      mediaRef.current?.pause();
    } else {
      mediaRef.current?.play();
    }
    setIsPlaying(!isPlaying);
    setShowControls(true);
  };

  const handleVolumeToggle = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    setShowControls(true);
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    if (mediaRef.current && mediaRef.current.duration) {
      const newTime = percentage * mediaRef.current.duration;
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleFullscreen = () => {
    if (isAudio) return; // Audio doesn't support fullscreen
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    if (isAudio) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  };

  // Audio Player UI
  if (isAudio) {
    return (
      <div className="audio-player-container glass-effect" ref={containerRef}>
        <div className="audio-artwork">
          {audioArtwork ? (
            <img src={audioArtwork} alt={title} className="audio-artwork-img" />
          ) : (
            <div className="audio-artwork-placeholder">
              <Music2 size={64} />
            </div>
          )}
          <div className="audio-wave-animation">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className={`wave-bar ${isPlaying ? 'active' : ''}`}
                style={{ animationDelay: `${i * 0.05}s`, height: `${20 + Math.sin(i) * 10}px` }}
              />
            ))}
          </div>
        </div>
        
        <div className="audio-info">
          <h3 className="audio-title">{title || 'Audio Track'}</h3>
          <div className="audio-controls">
            <button onClick={handlePlayPause} className="audio-play-btn">
              {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" />}
            </button>
            
            <div className="audio-progress-container" onClick={handleSeek}>
              <div className="audio-progress-track">
                <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            
            <div className="audio-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            
            <button onClick={handleVolumeToggle} className="audio-volume-btn">
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>
        
        <audio
          ref={mediaRef}
          src={src}
          autoPlay={autoPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      </div>
    );
  }

  // Video Player UI
  return (
    <div 
      ref={containerRef}
      className={`adaptive-video-container ${isFullscreen ? 'fullscreen-mode' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {!isPlaying && thumbnailUrl && !mediaRef.current?.currentTime ? (
        <div className="video-thumbnail-overlay">
          <img src={thumbnailUrl} alt={title} className="video-thumbnail-img" />
          <div className="thumbnail-gradient"></div>
          <button className="play-button-large" onClick={handlePlayPause}>
            <div className="play-icon-wrapper">
              <Play size={48} fill="white" />
            </div>
          </button>
          {title && <h3 className="video-title-overlay">{title}</h3>}
        </div>
      ) : null}

      <video
        ref={mediaRef}
        src={src}
        autoPlay={autoPlay}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="adaptive-video-element"
        onClick={handlePlayPause}
      />

      {/* Custom Controls */}
      {showControls && isPlaying && (
        <div className="video-controls-custom">
          <div className="controls-backdrop"></div>
          <div className="controls-container">
            <div className="progress-bar-container" onClick={handleSeek}>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                <div 
                  className="progress-bar-handle" 
                  style={{ left: `${progress}%` }}
                />
              </div>
            </div>
            
            <div className="controls-buttons-container">
              <div className="controls-left">
                <button onClick={handlePlayPause} className="control-btn">
                  {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
                </button>
                <button onClick={handleVolumeToggle} className="control-btn">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span> / </span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              <div className="controls-right">
                <button onClick={toggleFullscreen} className="control-btn">
                  <Maximize2 size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Play/Pause Overlay for Quick Interaction */}
      {isPlaying && showControls && (
        <div className="quick-play-pause-overlay" onClick={handlePlayPause}>
          {isPlaying ? <Pause size={48} className="quick-icon" /> : <Play size={48} className="quick-icon" />}
        </div>
      )}
    </div>
  );
};

export default function GalleryPage() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', sortBy: 'latest' });
  const [user, setUser] = useState(null);
  const [likedMedia, setLikedMedia] = useState({});
  const [savedMedia, setSavedMedia] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trendingMedia, setTrendingMedia] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [showContent, setShowContent] = useState(false);
   const [hoveredCard, setHoveredCard] = useState(null);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  const modalRef = useRef(null);

  // Stunning loading animation sequence
  useEffect(() => {
    if (loading) {
      const stages = [
        { progress: 15, message: "Waking up the gallery...", icon: "✨", description: "Starting the visual journey" },
        { progress: 30, message: "Gathering memories...", icon: "📸", description: "Collecting precious moments" },
        { progress: 45, message: "Polishing moments...", icon: "✨", description: "Enhancing every detail" },
        { progress: 60, message: "Almost there...", icon: "🎨", description: "Adding the final touches" },
        { progress: 75, message: "Adding finishing touches...", icon: "🌟", description: "Making it perfect" },
        { progress: 90, message: "Preparing your experience...", icon: "🎭", description: "Almost ready to reveal" },
        { progress: 100, message: "Welcome to the gallery!", icon: "🎉", description: "Your memories await" }
      ];
      
      let currentStage = 0;
      const stageInterval = setInterval(() => {
        if (currentStage < stages.length - 1) {
          currentStage++;
          setLoadingStage(currentStage);
          setLoadingProgress(stages[currentStage].progress);
        }
      }, 800);
      
      return () => clearInterval(stageInterval);
    }
  }, [loading]);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check auth and fetch data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/api/me')
        .then(res => setUser(res.data))
        .catch(() => {});
    }
    fetchMedia();
    fetchTrending();
  }, [filters]);

  const fetchMedia = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingStage(0);
    setShowContent(false);
    
    try {
      const params = new URLSearchParams({
        category: filters.category,
        sortBy: filters.sortBy,
        limit: 24
      });
      const res = await publicApi.get(`/api/media/public?${params}`);
      setMedia(res.data.media || []);
      
      setTimeout(() => {
        setLoadingProgress(100);
        setTimeout(() => {
          setShowContent(true);
          setTimeout(() => {
            setLoading(false);
          }, 500);
        }, 300);
      }, 500);
    } catch (error) {
      console.error('Error fetching media:', error);
      setLoading(false);
      setShowContent(true);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await publicApi.get('/api/media/trending?limit=6');
      setTrendingMedia(res.data || []);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const fetchComments = async (mediaId, page = 1) => {
    setCommentsLoading(true);
    try {
      const res = await publicApi.get(`/api/media/${mediaId}/comments?page=${page}&limit=20`);
      if (page === 1) {
        setComments(res.data.comments);
      } else {
        setComments(prev => [...prev, ...res.data.comments]);
      }
      setCommentsPagination({
        page: res.data.pagination.page,
        totalPages: res.data.pagination.totalPages,
        total: res.data.pagination.total
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSelectMedia = async (media) => {
    setSelectedMedia(media);
    setComments([]);
    await fetchComments(media.id);
  };

  const loadMoreComments = async () => {
    if (commentsPagination.page < commentsPagination.totalPages) {
      await fetchComments(selectedMedia.id, commentsPagination.page + 1);
    }
  };

  const handleLike = async (mediaId) => {
    if (!user) {
      alert('Please login to like');
      return;
    }
    try {
      const res = await api.post(`/api/media/${mediaId}/like`);
      const data = res.data;
      setLikedMedia(prev => ({ ...prev, [mediaId]: data.liked }));
      setMedia(prev => prev.map(m => 
        m.id === mediaId 
          ? { ...m, _count: { ...m._count, likes: data.liked ? m._count.likes + 1 : m._count.likes - 1 } }
          : m
      ));
      
      if (selectedMedia?.id === mediaId) {
        setSelectedMedia(prev => ({
          ...prev,
          _count: { ...prev._count, likes: data.liked ? prev._count.likes + 1 : prev._count.likes - 1 }
        }));
      }
      
      const likeBtn = document.getElementById(`like-${mediaId}`);
      if (likeBtn) {
        likeBtn.classList.add('animate-like');
        setTimeout(() => likeBtn.classList.remove('animate-like'), 300);
      }
    } catch (error) {
      console.error('Error liking:', error);
    }
  };

  const handleSave = (mediaId) => {
    if (!user) {
      alert('Please login to save');
      return;
    }
    setSavedMedia(prev => ({ ...prev, [mediaId]: !prev[mediaId] }));
    
    const toast = document.createElement('div');
    toast.className = 'save-toast';
    toast.innerHTML = savedMedia[mediaId] ? 'Removed from saved' : 'Saved to collection';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleComment = async () => {
    if (!comment.trim() || !selectedMedia || commentLoading) return;
    
    setCommentLoading(true);
    try {
      const res = await api.post(`/api/media/${selectedMedia.id}/comments`, {
        content: comment
      });
      const newComment = res.data;
      
      setComments(prev => [newComment, ...prev]);
      setCommentsPagination(prev => ({ ...prev, total: prev.total + 1 }));
      
      setMedia(prev => prev.map(m => 
        m.id === selectedMedia.id 
          ? { ...m, _count: { ...m._count, comments: (m._count.comments || 0) + 1 } }
          : m
      ));
      
      setSelectedMedia(prev => ({
        ...prev,
        _count: { ...prev._count, comments: (prev._count.comments || 0) + 1 }
      }));
      
      setComment('');
    } catch (error) {
      console.error('Error commenting:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleShare = async (media) => {
    const shareUrl = `${window.location.origin}/gallery?media=${media.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: media.title,
          text: media.description || 'Check out this amazing media from ZUCA Gallery!',
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      setShowShareModal(true);
    }
    
    if (user) {
      await api.post(`/api/media/${media.id}/share`, { platform: 'direct' });
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = async (media) => {
    try {
      const link = document.createElement('a');
      link.href = media.url;
      link.download = media.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (user) {
        await api.post(`/api/media/${media.id}/download`);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

    const navigate = useNavigate();


  const goBack = () => {
    console.log('Going to dashboard');
    window.history.back();
};
  const getMediaIcon = (type) => {
    switch(type) {
      case 'video': return <Video className="media-icon" />;
      case 'audio': return <Music2 className="media-icon" />;
      case 'document': return <FileText className="media-icon" />;
      default: return <ImageIcon className="media-icon" />;
    }
  };

  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  const timeAgo = (date) => formatDistance(new Date(date), new Date(), { addSuffix: true });

  const categories = [
    { id: 'all', name: 'All', icon: Camera },
    { id: 'mass', name: 'Holy Mass', icon: Award },
    { id: 'fellowship', name: 'Fellowship', icon: Users },
    { id: 'outreach', name: 'Outreach', icon: Heart },
    { id: 'events', name: 'Events', icon: Star },
    { id: 'retreat', name: 'Retreats', icon: Zap }
  ];

  const stages = [
    { progress: 15, message: "Waking up the gallery...", icon: "✨", description: "Starting the visual journey" },
    { progress: 30, message: "Gathering memories...", icon: "📸", description: "Collecting precious moments" },
    { progress: 45, message: "Polishing moments...", icon: "✨", description: "Enhancing every detail" },
    { progress: 60, message: "Almost there...", icon: "🎨", description: "Adding the final touches" },
    { progress: 75, message: "Adding finishing touches...", icon: "🌟", description: "Making it perfect" },
    { progress: 90, message: "Preparing your experience...", icon: "🎭", description: "Almost ready to reveal" },
    { progress: 100, message: "Welcome to the gallery!", icon: "🎉", description: "Your memories await" }
  ];

  const currentStage = stages[loadingStage] || stages[0];

  // Stunning loading screen
  if (loading) {
    return (
      <div className="premium-loading-screen">
        <div className="loading-gradient-bg">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
          <div className="gradient-orb orb-4"></div>
        </div>

        <div className="loading-glass-container">
          <div className="loading-content-wrapper">
            <div className="loading-logo-section">
              <div className="logo-animation">
                <div className="logo-ring ring-1"></div>
                <div className="logo-ring ring-2"></div>
                <div className="logo-ring ring-3"></div>
                <div className="logo-icon-container">
                  <Camera className="logo-camera" size={56} />
                  <div className="logo-sparkle">
                    <Sparkles size={24} />
                  </div>
                </div>
              </div>
            </div>

            <div className="loading-text-section">
              <div className="loading-stage-icon">
                <span className="stage-icon">{currentStage.icon}</span>
              </div>
              <h2 className="loading-main-message">
                {currentStage.message}
              </h2>
              <p className="loading-description">
                {currentStage.description}
              </p>
            </div>

            <div className="loading-progress-section">
              <div className="progress-label">
                <span className="progress-text">Loading gallery</span>
                <span className="progress-percentage">{Math.min(Math.floor(loadingProgress), 100)}%</span>
              </div>
              <div className="glass-progress-bar">
                <div 
                  className="glass-progress-fill"
                  style={{ width: `${Math.min(loadingProgress, 100)}%` }}
                >
                  <div className="progress-glow"></div>
                </div>
              </div>
            </div>

            <div className="loading-particles">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i}
                  className="particle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 3}s`
                  }}
                />
              ))}
            </div>

            <div className="loading-quote">
              <div className="quote-content">
                <Compass size={16} />
                <span>Every picture tells a story</span>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .premium-loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: linear-gradient(135deg, #0a0a1e 0%, #1a0033 50%, #0a0a1e 100%);
          }

          .loading-gradient-bg {
            position: absolute;
            inset: 0;
            overflow: hidden;
          }

          .gradient-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            animation: floatOrb 20s ease-in-out infinite;
          }

          .orb-1 {
            width: 500px;
            height: 500px;
            top: -200px;
            right: -200px;
            background: radial-gradient(circle, rgba(59,130,246,0.3), rgba(99,102,241,0.1));
          }

          .orb-2 {
            width: 400px;
            height: 400px;
            bottom: -150px;
            left: -150px;
            background: radial-gradient(circle, rgba(139,92,246,0.3), rgba(59,130,246,0.1));
            animation-delay: -5s;
          }

          .orb-3 {
            width: 600px;
            height: 600px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(6,182,212,0.2), rgba(59,130,246,0.05));
            animation-delay: -10s;
          }

          .orb-4 {
            width: 350px;
            height: 350px;
            top: 20%;
            right: 20%;
            background: radial-gradient(circle, rgba(245,158,11,0.2), rgba(139,92,246,0.1));
            animation-delay: -15s;
          }

          @keyframes floatOrb {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(50px, -50px) scale(1.1); }
            66% { transform: translate(-30px, 30px) scale(0.9); }
          }

          .loading-glass-container {
            position: relative;
            z-index: 10;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            border-radius: 48px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: containerGlow 2s ease-in-out infinite;
          }

          @keyframes containerGlow {
            0%, 100% {
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              border-color: rgba(255, 255, 255, 0.1);
            }
            50% {
              box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.3);
              border-color: rgba(59, 130, 246, 0.3);
            }
          }

          .loading-content-wrapper {
            padding: 60px 80px;
            text-align: center;
            min-width: 500px;
          }

          .loading-logo-section {
            margin-bottom: 40px;
          }

          .logo-animation {
            position: relative;
            width: 120px;
            height: 120px;
            margin: 0 auto;
          }

          .logo-ring {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 2px solid transparent;
            animation: ringPulse 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
          }

          .ring-1 {
            border-top-color: #3b82f6;
            border-right-color: #3b82f6;
          }

          .ring-2 {
            border-bottom-color: #8b5cf6;
            border-left-color: #8b5cf6;
            animation-delay: 0.3s;
            width: 90%;
            height: 90%;
            top: 5%;
            left: 5%;
          }

          .ring-3 {
            border-top-color: #06b6d4;
            border-right-color: #06b6d4;
            animation-delay: 0.6s;
            width: 70%;
            height: 70%;
            top: 15%;
            left: 15%;
          }

          @keyframes ringPulse {
            0% {
              transform: scale(0.8);
              opacity: 0;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(1.2);
              opacity: 0;
            }
          }

          .logo-icon-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .logo-camera {
            color: white;
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
            animation: cameraPulse 2s ease-in-out infinite;
          }

          .logo-sparkle {
            position: absolute;
            top: -10px;
            right: -10px;
            animation: sparkleRotate 3s linear infinite;
          }

          @keyframes cameraPulse {
            0%, 100% {
              transform: scale(1);
              filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
            }
            50% {
              transform: scale(1.05);
              filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.8));
            }
          }

          @keyframes sparkleRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .loading-text-section {
            margin-bottom: 40px;
          }

          .loading-stage-icon {
            font-size: 48px;
            margin-bottom: 20px;
            animation: bounceIcon 1s ease-in-out infinite;
          }

          @keyframes bounceIcon {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }

          .loading-main-message {
            font-size: 28px;
            font-weight: 600;
            background: linear-gradient(135deg, #fff, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 12px;
            animation: gradientShift 3s ease infinite;
          }

          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }

          .loading-description {
            color: rgba(255, 255, 255, 0.6);
            font-size: 14px;
            letter-spacing: 0.5px;
          }

          .loading-progress-section {
            margin-bottom: 40px;
          }

          .progress-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
          }

          .progress-text {
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .progress-percentage {
            font-weight: 600;
            color: #3b82f6;
          }

          .glass-progress-bar {
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            overflow: hidden;
            backdrop-filter: blur(10px);
          }

          .glass-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
            border-radius: 10px;
            position: relative;
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
          }

          .progress-glow {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            animation: shimmer 1.5s infinite;
          }

          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }

          .loading-particles {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
          }

          .particle {
            position: absolute;
            bottom: -10px;
            width: 2px;
            height: 10px;
            background: linear-gradient(to top, #3b82f6, transparent);
            border-radius: 2px;
            animation: particleFloat linear infinite;
            opacity: 0;
          }

          @keyframes particleFloat {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 0.5;
            }
            90% {
              opacity: 0.5;
            }
            100% {
              transform: translateY(-100vh) rotate(360deg);
              opacity: 0;
            }
          }

          .loading-quote {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .quote-content {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 12px;
            letter-spacing: 0.5px;
          }

          @media (max-width: 768px) {
            .loading-content-wrapper {
              padding: 40px 30px;
              min-width: auto;
              width: 90%;
            }
            .logo-animation {
              width: 80px;
              height: 80px;
            }
            .logo-camera {
              width: 40px;
              height: 40px;
            }
            .loading-main-message {
              font-size: 20px;
            }
            .loading-stage-icon {
              font-size: 36px;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`gallery-container ${showContent ? 'content-fade-in' : ''}`}>
      <div className="floating-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>

      <div className="gallery-content">
        {/* Hero Section */}
        <div className="hero-card glass-effect">
          <div className="hero-top">
            <div className="hero-left">
              <button className="back-button" onClick={goBack} aria-label="Go back">
                <ArrowLeft size={24} />
              </button>
              <div className="logo-wrapper">
                <Camera className="logo-icon" />
              </div>
              <div className="hero-info">
                <h1 className="hero-title">ZUCA Media Gallery</h1>
                <div className="hero-meta">
                  <span className="stat-badge">
                    <ImageIcon size={14} /> {media.length} Memories
                  </span>
                  <span className="live-badge pulse-live">LIVE</span>
                  <span className="time-badge">{format(currentTime, 'HH:mm:ss')}</span>
                </div>
              </div>
            </div>
            <div className="hero-right">
              <div className="view-toggle">
                <button 
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} 
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`} 
                  onClick={() => setViewMode('compact')}
                >
                  <Grid3x3 size={16} />
                </button>
              </div>
            </div>
          </div>
          <div className="quick-stats">
            <div className="quick-stat-item">
              <Camera className="quick-stat-icon" />
              <span className="quick-stat-label">Total Media</span>
              <span className="quick-stat-value">{media.length}</span>
            </div>
            <div className="quick-stat-item">
              <Heart className="quick-stat-icon" />
              <span className="quick-stat-label">Total Likes</span>
              <span className="quick-stat-value">{media.reduce((sum, m) => sum + (m._count?.likes || 0), 0).toLocaleString()}</span>
            </div>
            <div className="quick-stat-item">
              <Eye className="quick-stat-icon" />
              <span className="quick-stat-label">Total Views</span>
              <span className="quick-stat-value">{media.reduce((sum, m) => sum + (m._count?.views || 0), 0).toLocaleString()}</span>
            </div>
            <div className="quick-stat-item">
              <MessageCircle className="quick-stat-icon" />
              <span className="quick-stat-label">Comments</span>
              <span className="quick-stat-value">{media.reduce((sum, m) => sum + (m._count?.comments || 0), 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Trending Section */}
        {trendingMedia.length > 0 && (
          <div className="trending-section glass-effect">
            <div className="trending-header">
              <TrendingUp size={20} className="trending-icon" />
              <h2 className="trending-title">Trending Now</h2>
              <span className="trending-badge">🔥 Hot</span>
            </div>
            <div className="trending-scroll">
              {trendingMedia.map((item) => (
                <div 
                  key={item.id} 
                  className="trending-card" 
                  onClick={() => handleSelectMedia(item)}
                >
                  <div className="trending-media">
                    {item.type === 'image' ? (
                      <img src={item.url} alt={item.title} />
                    ) : item.type === 'video' && item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} />
                    ) : (
                      <div className="trending-placeholder">
                        {getMediaIcon(item.type)}
                      </div>
                    )}
                    <div className="trending-overlay">
                      <Play size={24} />
                    </div>
                  </div>
                  <div className="trending-info">
                    <h4>{item.title}</h4>
                    <div className="trending-stats">
                      <span><Eye size={12} /> {item._count?.views || 0}</span>
                      <span><Heart size={12} /> {item._count?.likes || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="filters-bar glass-effect">
          <div className="categories-scroll">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <button 
                  key={cat.id} 
                  onClick={() => setFilters({ ...filters, category: cat.id })} 
                  className={`category-btn ${filters.category === cat.id ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
          <div className="sort-selector">
            <select 
              value={filters.sortBy} 
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })} 
              className="sort-select"
            >
              <option value="latest">Latest First</option>
              <option value="popular">Most Liked</option>
              <option value="mostViewed">Most Viewed</option>
            </select>
          </div>
        </div>

        {/* Media Grid */}
        {media.length === 0 ? (
          <div className="empty-state glass-effect">
            <Camera size={64} className="empty-icon" />
            <h3>No media yet</h3>
            <p>Be the first to share memories from our community</p>
            {user && (user.role === 'admin' || user.specialRole === 'secretary') && (
              <a href="/admin/media" className="upload-link">
                <Camera size={18} /> Upload Now
              </a>
            )}
          </div>
        ) : (
          <div className={`media-grid ${viewMode}`}>
            {media.map((item, index) => (
              <div 
                key={item.id} 
                className={`media-card glass-effect ${hoveredCard === item.id ? 'hovered' : ''}`} 
                onClick={() => handleSelectMedia(item)} 
                onMouseEnter={() => setHoveredCard(item.id)} 
                onMouseLeave={() => setHoveredCard(null)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="card-media">
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.title} className="card-image" loading="lazy" />
                  ) : item.type === 'video' ? (
                    <div className="video-preview">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="card-image" />
                      ) : (
                        <div className="video-placeholder">
                          <Video size={48} />
                          <span>Video</span>
                        </div>
                      )}
                      <div className="play-overlay">
                        <Play size={32} />
                      </div>
                    </div>
                  ) : item.type === 'audio' ? (
                    <div className="audio-preview">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="card-image" />
                      ) : (
                        <div className="audio-placeholder">
                          <Music2 size={48} />
                          <span>Audio</span>
                        </div>
                      )}
                      <div className="play-overlay">
                        <Play size={32} />
                      </div>
                    </div>
                  ) : (
                    <div className="card-file">
                      {getMediaIcon(item.type)}
                      <span>{item.type}</span>
                    </div>
                  )}
                  <div className="card-overlay">
                    <button className="quick-view-btn">
                      <Eye size={18} /> Quick View
                    </button>
                  </div>
                  {item.isFeatured && (
                    <div className="featured-badge">
                      <Star size={12} /> Featured
                    </div>
                  )}
                  <button 
                    className={`save-badge ${savedMedia[item.id] ? 'saved' : ''}`} 
                    onClick={(e) => { e.stopPropagation(); handleSave(item.id); }}
                  >
                    <Bookmark size={12} />
                  </button>
                </div>
                <div className="card-info">
                  <h3 className="card-title">{item.title}</h3>
                  <div className="card-stats">
                    <button 
                      id={`like-${item.id}`} 
                      className={`stat-btn ${likedMedia[item.id] ? 'liked' : ''}`} 
                      onClick={(e) => { e.stopPropagation(); handleLike(item.id); }}
                    >
                      <Heart size={14} />
                      <span>{item._count.likes}</span>
                    </button>
                    <div className="stat">
                      <Eye size={14} />
                      <span>{item._count.views}</span>
                    </div>
                    <div className="stat">
                      <MessageCircle size={14} />
                      <span>{item._count.comments}</span>
                    </div>
                  </div>
                  <div className="card-meta">
                    <span className="meta-user">
                      <User size={12} />
                      {item.uploadedBy?.fullName?.split(' ')[0] || 'Anonymous'}
                    </span>
                    <span className="meta-date">
                      <Clock size={12} />
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Modal */}
      {selectedMedia && (
        <div className="media-modal" onClick={() => setSelectedMedia(null)}>
          <div className="modal-glass" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-close" onClick={() => setSelectedMedia(null)}>
                <X size={24} />
              </button>
              <div className="modal-title-bar">
                <h2>{selectedMedia.title}</h2>
                <div className="modal-actions">
                  <button onClick={() => handleSave(selectedMedia.id)} className="action-icon">
                    <Bookmark size={20} className={savedMedia[selectedMedia.id] ? 'saved' : ''} />
                  </button>
                  <button onClick={() => handleShare(selectedMedia)} className="action-icon">
                    <Share2 size={20} />
                  </button>
                  <button onClick={() => handleDownload(selectedMedia)} className="action-icon">
                    <Download size={20} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="modal-body">
              <div className="modal-media">
                {selectedMedia.type === 'image' ? (
                  <img src={selectedMedia.url} alt={selectedMedia.title} />
                ) : selectedMedia.type === 'video' ? (
                  <AdaptiveMediaPlayer 
                    src={selectedMedia.url} 
                    thumbnailUrl={selectedMedia.thumbnailUrl}
                    title={selectedMedia.title}
                    type="video"
                    autoPlay={true}
                  />
                ) : selectedMedia.type === 'audio' ? (
                  <AdaptiveMediaPlayer 
                    src={selectedMedia.url} 
                    thumbnailUrl={selectedMedia.thumbnailUrl}
                    title={selectedMedia.title}
                    type="audio"
                    autoPlay={false}
                  />
                ) : (
                  <div className="file-preview">
                    {getMediaIcon(selectedMedia.type)}
                    <p>{selectedMedia.title}</p>
                    <a href={selectedMedia.url} download className="download-btn-large">
                      <Download size={20} /> Download File
                    </a>
                  </div>
                )}
              </div>
              
              <div className="modal-info">
                {selectedMedia.description && (
                  <p className="modal-description">{selectedMedia.description}</p>
                )}
                <div className="modal-stats">
                  <button 
                    className={`stat-large ${likedMedia[selectedMedia.id] ? 'liked' : ''}`} 
                    onClick={() => handleLike(selectedMedia.id)}
                  >
                    <ThumbsUp size={20} />
                    <span>{selectedMedia._count.likes} Likes</span>
                  </button>
                  <div className="stat-large">
                    <Eye size={20} />
                    <span>{selectedMedia._count.views} Views</span>
                  </div>
                  <div className="stat-large">
                    <MessageCircle size={20} />
                    <span>{selectedMedia._count.comments} Comments</span>
                  </div>
                </div>
                <div className="modal-meta">
                  <span>📅 {formatDate(selectedMedia.createdAt)}</span>
                  <span>👤 {selectedMedia.uploadedBy?.fullName || 'Anonymous'}</span>
                  <span>📁 {selectedMedia.category}</span>
                </div>
                
                <div className="comments-section">
                  <h3><MessageCircle size={18} /> Comments ({commentsPagination.total})</h3>
                  
                  {user ? (
                    <div className="comment-input">
                      <div className="comment-avatar">
                        {user.profileImage ? 
                          <img src={user.profileImage} alt={user.fullName} /> : 
                          <div className="avatar-placeholder">{user.fullName?.charAt(0) || 'U'}</div>
                        }
                      </div>
                      <div className="comment-input-wrapper">
                        <input 
                          type="text" 
                          value={comment} 
                          onChange={(e) => setComment(e.target.value)} 
                          placeholder="Add a comment..." 
                          onKeyPress={(e) => e.key === 'Enter' && !commentLoading && handleComment()} 
                          disabled={commentLoading} 
                        />
                        <button onClick={handleComment} disabled={!comment.trim() || commentLoading}>
                          {commentLoading ? (
                            <>
                              <div className="btn-spinner"></div>
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send size={16} /> Post
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="login-to-comment">
                      <p>Please <a href="/login">login</a> to comment</p>
                    </div>
                  )}
                  
                  <div className="comments-list-container">
                    {commentsLoading && comments.length === 0 ? (
                      <div className="comments-loading">
                        <div className="spinner"></div>
                        <p>Loading comments...</p>
                      </div>
                    ) : comments.length > 0 ? (
                      <>
                        {comments.map((c) => (
                          <div key={c.id} className="comment-item">
                            <div className="comment-avatar">
                              {c.user?.profileImage ? 
                                <img src={c.user.profileImage} alt={c.user.fullName} /> : 
                                <div className="avatar-placeholder small">{c.user?.fullName?.charAt(0) || 'A'}</div>
                              }
                            </div>
                            <div className="comment-content">
                              <div className="comment-header">
                                <span className="comment-author">{c.user?.fullName || 'Anonymous'}</span>
                                <span className="comment-date">{timeAgo(c.createdAt)}</span>
                              </div>
                              <p className="comment-text">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        {commentsPagination.page < commentsPagination.totalPages && (
                          <button onClick={loadMoreComments} className="load-more-comments">
                            Load more comments ({commentsPagination.total - comments.length} remaining)
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="no-comments">
                        <MessageCircle size={40} strokeWidth={1} />
                        <p>No comments yet</p>
                        <span>Be the first to share your thoughts</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="share-header">
              <h3>Share this media</h3>
              <button onClick={() => setShowShareModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="share-url">
              <input 
                type="text" 
                value={`${window.location.origin}/gallery?media=${selectedMedia?.id}`} 
                readOnly 
              />
              <button onClick={() => copyToClipboard(`${window.location.origin}/gallery?media=${selectedMedia?.id}`)}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="share-platforms">
              <button className="facebook"><Facebook size={24} /> Facebook</button>
              <button className="twitter"><Twitter size={24} /> Twitter</button>
              <button className="instagram"><Instagram size={24} /> Instagram</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .gallery-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a1e 0%, #1a0033 50%, #0a0a1e 100%);
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .content-fade-in {
          animation: contentFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes contentFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .floating-bg {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.08;
          animation: float 20s infinite;
        }

        .blob-1 { width: 500px; height: 500px; top: -100px; right: -100px; background: #3b82f6; }
        .blob-2 { width: 400px; height: 400px; bottom: -100px; left: -100px; background: #8b5cf6; animation-delay: -5s; }
        .blob-3 { width: 600px; height: 600px; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #6366f1; animation-delay: -10s; }
        .blob-4 { width: 300px; height: 300px; top: 20%; right: 20%; background: #06b6d4; animation-delay: -15s; }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .gallery-content {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .hero-card {
          border-radius: 30px;
          padding: 25px 30px;
          margin-bottom: 25px;
        }

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .hero-left { display: flex; align-items: center; gap: 15px; }

        .back-button {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .logo-wrapper { 
          padding: 12px; 
          background: linear-gradient(135deg, #3b82f6, #6366f1); 
          border-radius: 15px; 
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
        }

        .logo-icon { width: 30px; height: 30px; color: white; }

        .hero-title { 
          font-size: 28px; 
          font-weight: bold; 
          color: white; 
          margin-bottom: 5px;
          background: linear-gradient(135deg, #fff, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .stat-badge { 
          display: flex; 
          align-items: center; 
          gap: 5px; 
          padding: 4px 10px; 
          background: rgba(255,255,255,0.1); 
          border-radius: 20px; 
          font-size: 12px; 
          color: rgba(255,255,255,0.8); 
        }

        .live-badge { 
          padding: 2px 8px; 
          background: rgba(16, 185, 129, 0.2); 
          border: 1px solid rgba(16, 185, 129, 0.3); 
          border-radius: 12px; 
          color: #10b981; 
          font-size: 12px; 
        }

        .pulse-live {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .time-badge { 
          padding: 2px 8px; 
          background: rgba(255,255,255,0.1); 
          border: 1px solid rgba(255,255,255,0.2); 
          border-radius: 12px; 
          color: rgba(255,255,255,0.8); 
          font-size: 12px; 
        }

        .view-toggle { 
          display: flex; 
          gap: 8px; 
          background: rgba(255,255,255,0.1); 
          border-radius: 12px; 
          padding: 4px; 
        }

        .view-btn { 
          padding: 8px 12px; 
          background: transparent; 
          border: none; 
          border-radius: 8px; 
          color: rgba(255,255,255,0.6); 
          cursor: pointer; 
          transition: all 0.3s; 
        }

        .view-btn.active { 
          background: rgba(255,255,255,0.2); 
          color: white; 
        }

        .quick-stats { 
          display: flex; 
          gap: 30px; 
          margin-top: 20px; 
          padding-top: 20px; 
          border-top: 1px solid rgba(255,255,255,0.1); 
          flex-wrap: wrap; 
        }

        .quick-stat-item { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          transition: transform 0.3s ease;
        }

        .quick-stat-item:hover {
          transform: translateY(-2px);
        }

        .quick-stat-icon { 
          width: 18px; 
          height: 18px; 
          color: rgba(255,255,255,0.6); 
        }

        .quick-stat-label { 
          color: rgba(255,255,255,0.7); 
          font-size: 13px; 
        }

        .quick-stat-value { 
          color: white; 
          font-size: 14px; 
          font-weight: bold; 
        }

        .trending-section { 
          border-radius: 20px; 
          padding: 20px; 
          margin-bottom: 25px; 
        }

        .trending-header { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          margin-bottom: 15px; 
        }

        .trending-icon { color: #f59e0b; }

        .trending-title { 
          color: white; 
          font-size: 18px; 
          font-weight: 600; 
        }

        .trending-badge { 
          padding: 2px 8px; 
          background: rgba(245, 158, 11, 0.2); 
          border-radius: 12px; 
          color: #f59e0b; 
          font-size: 12px; 
        }

        .trending-scroll { 
          display: flex; 
          gap: 15px; 
          overflow-x: auto; 
          padding-bottom: 10px; 
        }

        .trending-card { 
          min-width: 180px; 
          background: rgba(255,255,255,0.05); 
          border-radius: 12px; 
          overflow: hidden; 
          cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        }

        .trending-card:hover { 
          transform: translateY(-4px) scale(1.02); 
          box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
        }

        .trending-media { 
          position: relative; 
          aspect-ratio: 16/9; 
          background: #1a1a2e; 
        }

        .trending-media img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
        }

        .trending-placeholder { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100%; 
        }

        .trending-overlay { 
          position: absolute; 
          inset: 0; 
          background: rgba(0,0,0,0.5); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          opacity: 0; 
          transition: opacity 0.3s; 
        }

        .trending-card:hover .trending-overlay { opacity: 1; }

        .trending-info { padding: 10px; }

        .trending-info h4 { 
          color: white; 
          font-size: 12px; 
          margin-bottom: 5px; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
        }

        .trending-stats { 
          display: flex; 
          gap: 10px; 
          font-size: 10px; 
          color: rgba(255,255,255,0.5); 
        }

        .trending-stats span { 
          display: flex; 
          align-items: center; 
          gap: 3px; 
        }

        .filters-bar { 
          border-radius: 20px; 
          padding: 15px 20px; 
          margin-bottom: 25px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          flex-wrap: wrap; 
          gap: 15px; 
        }

        .categories-scroll { 
          display: flex; 
          gap: 10px; 
          flex-wrap: wrap; 
        }

        .category-btn { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          padding: 8px 16px; 
          background: rgba(255,255,255,0.05); 
          border: 1px solid rgba(255,255,255,0.1); 
          border-radius: 25px; 
          color: rgba(255,255,255,0.8); 
          font-size: 13px; 
          cursor: pointer; 
          transition: all 0.3s; 
        }

        .category-btn:hover { 
          background: rgba(255,255,255,0.1); 
          transform: translateY(-2px); 
        }

        .category-btn.active { 
          background: linear-gradient(90deg, #3b82f6, #6366f1); 
          border-color: transparent; 
          color: white; 
        }

        .sort-select { 
          padding: 8px 16px; 
          background: rgba(255,255,255,0.1); 
          border: 1px solid rgba(255,255,255,0.2); 
          border-radius: 12px; 
          color: white; 
          font-size: 13px; 
          cursor: pointer; 
          outline: none; 
        }

        .media-grid { 
          display: grid; 
          gap: 20px; 
        }

        .media-grid.grid { 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
        }

        .media-grid.compact { 
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); 
        }

        .media-card { 
          border-radius: 30px; 
          overflow: hidden; 
          cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          animation: fadeInUp 0.5s ease forwards; 
          opacity: 0; 
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .media-card:hover { 
          transform: translateY(-8px) scale(1.02); 
          box-shadow: 0 20px 40px rgba(0,0,0,0.3); 
        }

        .card-media { 
          position: relative; 
          aspect-ratio: 1/1; 
          background: linear-gradient(135deg, #1a1a2e, #1a50e2); 
          overflow: hidden; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }

        .card-image { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); 
        }

        .media-card:hover .card-image { transform: scale(1.1); }

        .video-preview, .audio-preview { 
          position: relative; 
          width: 100%; 
          height: 100%; 
        }

        .video-placeholder, .audio-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: linear-gradient(135deg, #1a1a2e, #0f47e0);
          color: rgba(255, 255, 255, 0.5);
        }

        .video-placeholder svg, .audio-placeholder svg { margin-bottom: 8px; }

        .play-overlay { 
          position: absolute; 
          inset: 0; 
          background: rgba(0,0,0,0.5); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
        }

        .card-file { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          height: 100%; 
        }

        .media-icon { 
          width: 48px; 
          height: 48px; 
          color: rgba(255,255,255,0.5); 
          margin-bottom: 8px; 
        }

        .card-overlay { 
          position: absolute; 
          inset: 0; 
          background: rgba(0,0,0,0.6); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          opacity: 0; 
          transition: opacity 0.3s; 
        }

        .media-card:hover .card-overlay { opacity: 1; }

        .quick-view-btn { 
          padding: 8px 16px; 
          background: rgba(255,255,255,0.2); 
          backdrop-filter: blur(5px); 
          border: 1px solid rgba(255,255,255,0.3); 
          border-radius: 25px; 
          color: white; 
          font-size: 12px; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 6px; 
        }

        .featured-badge { 
          position: absolute; 
          top: 10px; 
          left: 10px; 
          padding: 4px 8px; 
          background: linear-gradient(135deg, #f59e0b, #d97706); 
          border-radius: 12px; 
          color: white; 
          font-size: 10px; 
          display: flex; 
          align-items: center; 
          gap: 4px; 
        }

        .save-badge { 
          position: absolute; 
          top: 10px; 
          right: 10px; 
          padding: 6px; 
          background: rgba(0,0,0,0.6); 
          border-radius: 50%; 
          border: none; 
          color: white; 
          cursor: pointer; 
          transition: all 0.3s; 
        }

        .save-badge:hover { transform: scale(1.1); }

        .save-badge.saved { color: #f59e0b; }

        .card-info { padding: 15px; }

        .card-title { 
          font-size: 14px; 
          font-weight: 600; 
          color: white; 
          margin-bottom: 8px; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
        }

        .card-stats { 
          display: flex; 
          gap: 16px; 
          margin-bottom: 10px; 
        }

        .stat-btn, .stat { 
          display: flex; 
          align-items: center; 
          gap: 4px; 
          font-size: 11px; 
          color: rgba(255,255,255,0.6); 
          background: none; 
          border: none; 
          cursor: pointer; 
        }

        .stat-btn.liked { color: #ef4444; }

        .card-meta { 
          display: flex; 
          justify-content: space-between; 
          font-size: 10px; 
          color: rgba(255,255,255,0.4); 
        }

        .meta-user, .meta-date { 
          display: flex; 
          align-items: center; 
          gap: 4px; 
        }

        @keyframes likeAnimation {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        .animate-like { animation: likeAnimation 0.3s ease; }

        .empty-state { 
          text-align: center; 
          padding: 80px 20px; 
          border-radius: 30px; 
        }

        .empty-icon { 
          color: rgba(255,255,255,0.3); 
          margin-bottom: 20px; 
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .empty-state h3 { 
          color: white; 
          font-size: 20px; 
          margin-bottom: 10px; 
        }

        .empty-state p { 
          color: rgba(255,255,255,0.6); 
          margin-bottom: 20px; 
        }

        .upload-link { 
          display: inline-flex; 
          align-items: center; 
          gap: 8px; 
          padding: 10px 24px; 
          background: linear-gradient(90deg, #3b82f6, #6366f1); 
          border-radius: 25px; 
          color: white; 
          text-decoration: none; 
          font-size: 14px; 
          font-weight: 500; 
        }

        .media-modal { 
          position: fixed; 
          inset: 0; 
          z-index: 1000; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          padding: 20px; 
          background: linear-gradient(90deg, #0f1011, #84868077); 
          animation: fadeIn 0.2s ease; 
        }

        .modal-glass { 
          max-width: 1200px; 
          width: 100%; 
          max-height: 90vh; 
          background: linear-gradient(90deg, #09090a, #000000); 
          backdrop-filter: blur(20px); 
          border: 1px solid rgba(255,255,255,0.2); 
          border-radius: 30px; 
          overflow: hidden; 
          animation: scaleIn 0.3s ease; 
          display: flex; 
          flex-direction: column; 
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 20px; 
          border-bottom: 1px solid rgba(255,255,255,0.1); 
        }

        .modal-close { 
          background: rgba(255,255,255,0.1); 
          border: none; 
          border-radius: 50%; 
          width: 40px; 
          height: 40px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          cursor: pointer; 
          transition: all 0.3s; 
        }

        .modal-close:hover { 
          background: rgba(255,255,255,0.2); 
          transform: rotate(90deg); 
        }

        .modal-title-bar { 
          flex: 1; 
          margin-left: 20px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }

        .modal-title-bar h2 { 
          color: white; 
          font-size: 18px; 
          margin: 0; 
        }

        .modal-actions { 
          display: flex; 
          gap: 15px; 
        }

        .action-icon { 
          background: none; 
          border: none; 
          color: rgba(255,255,255,0.7); 
          cursor: pointer; 
          transition: all 0.3s; 
        }

        .action-icon:hover { 
          color: white; 
          transform: scale(1.1); 
        }

        .modal-body { 
          display: flex; 
          flex-direction: row; 
          flex: 1; 
          min-height: 500px; 
          overflow: hidden; 
        }

        .modal-media { 
          flex: 1; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          padding: 20px;
          background: #000000;
          min-height: 500px;
        }

        .modal-media img { 
          max-width: 100%; 
          max-height: 70vh; 
          width: auto;
          height: auto;
          object-fit: contain; 
          border-radius: 12px;
        }

        /* Audio Player Styles */
        .audio-player-container {
          width: 100%;
          max-width: 600px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .audio-artwork {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .audio-artwork-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .audio-artwork-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .audio-wave-animation {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 4px;
          padding: 12px;
          background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
        }

        .wave-bar {
          width: 4px;
          background: linear-gradient(to top, #3b82f6, #8b5cf6);
          border-radius: 2px;
          transition: height 0.1s ease;
        }

        .wave-bar.active {
          animation: wavePulse 0.5s ease-in-out infinite alternate;
        }

        @keyframes wavePulse {
          from { height: 20px; opacity: 0.5; }
          to { height: 40px; opacity: 1; }
        }

        .audio-info {
          width: 100%;
          text-align: center;
        }

        .audio-title {
          color: white;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 20px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .audio-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .audio-play-btn {
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border: none;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }

        .audio-play-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.6);
        }

        .audio-progress-container {
          flex: 1;
          min-width: 200px;
          cursor: pointer;
        }

        .audio-progress-track {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          position: relative;
        }

        .audio-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          border-radius: 2px;
          width: 0%;
          transition: width 0.1s linear;
        }

        .audio-time {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          font-family: monospace;
        }

        .audio-volume-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        }

        .audio-volume-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Video Player Styles */
        .adaptive-video-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
        }

        .adaptive-video-container.fullscreen-mode {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          background: black;
          border-radius: 0;
        }

        .adaptive-video-element {
          width: 100%;
          height: 100%;
          object-fit: contain;
          cursor: pointer;
        }

        .video-thumbnail-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          cursor: pointer;
          z-index: 2;
        }

        .video-thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6));
        }

        .play-button-large {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: none;
          border: none;
          cursor: pointer;
          z-index: 3;
          transition: transform 0.2s ease;
        }

        .play-button-large:hover {
          transform: translate(-50%, -50%) scale(1.1);
        }

        .play-icon-wrapper {
          width: 80px;
          height: 80px;
          background: rgba(59, 130, 246, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          transition: all 0.3s ease;
        }

        .play-button-large:hover .play-icon-wrapper {
          background: #3b82f6;
          transform: scale(1.05);
        }

        .video-title-overlay {
          position: absolute;
          bottom: 20px;
          left: 20px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          background: rgba(0,0,0,0.5);
          padding: 6px 12px;
          border-radius: 20px;
          backdrop-filter: blur(4px);
          z-index: 3;
        }

        .video-controls-custom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 10;
          animation: slideUp 0.2s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .controls-backdrop {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80px;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          pointer-events: none;
        }

        .controls-container {
          position: relative;
          padding: 12px 16px;
          z-index: 1;
        }

        .progress-bar-container {
          width: 100%;
          padding: 8px 0;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .progress-bar-track {
          width: 100%;
          height: 4px;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
          position: relative;
          cursor: pointer;
          transition: height 0.2s ease;
        }

        .progress-bar-track:hover {
          height: 6px;
        }

        .progress-bar-fill {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          border-radius: 2px;
          transition: width 0.1s linear;
        }

        .progress-bar-handle {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .progress-bar-container:hover .progress-bar-handle {
          opacity: 1;
        }

        .controls-buttons-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .controls-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .controls-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .control-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .control-btn:hover {
          background: rgba(255,255,255,0.2);
          transform: scale(1.05);
        }

        .time-display {
          color: white;
          font-size: 12px;
          font-family: monospace;
        }

        .quick-play-pause-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.3);
          cursor: pointer;
          z-index: 5;
          animation: fadeIn 0.2s ease;
        }

        .quick-icon {
          color: white;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
          animation: pulseIcon 0.2s ease;
        }

        @keyframes pulseIcon {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-info { 
          width: 380px; 
          padding: 30px; 
          overflow-y: auto; 
          border-left: 1px solid rgba(255,255,255,0.1); 
        }

        .modal-description { 
          color: rgba(255,255,255,0.7); 
          margin-bottom: 20px; 
          line-height: 1.5; 
        }

        .modal-stats { 
          display: flex; 
          gap: 24px; 
          padding: 15px 0; 
          border-top: 1px solid rgba(255,255,255,0.1); 
          border-bottom: 1px solid rgba(255,255,255,0.1); 
          margin-bottom: 20px; 
        }

        .stat-large { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          background: none; 
          border: none; 
          cursor: pointer; 
          color: rgba(255,255,255,0.7); 
          font-size: 14px; 
        }

        .stat-large.liked { color: #ef4444; }

        .modal-meta { 
          display: flex; 
          gap: 16px; 
          font-size: 12px; 
          color: rgba(255,255,255,0.5); 
          margin-bottom: 25px; 
          flex-wrap: wrap; 
        }

        .comments-section h3 { 
          display: flex; 
          align-items: center; 
          gap: 8px; 
          font-size: 16px; 
          color: white; 
          margin-bottom: 15px; 
        }

        .comment-input { 
          display: flex; 
          gap: 12px; 
          margin-bottom: 20px; 
        }

        .comment-avatar { 
          width: 32px; 
          height: 32px; 
          background: rgba(255,255,255,0.1); 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          overflow: hidden; 
        }

        .avatar-placeholder { 
          width: 32px; 
          height: 32px; 
          background: linear-gradient(135deg, #3b82f6, #6366f1); 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          font-size: 14px; 
          font-weight: bold; 
        }

        .avatar-placeholder.small { 
          width: 32px; 
          height: 32px; 
          font-size: 12px; 
        }

        .comment-input-wrapper { 
          flex: 1; 
          display: flex; 
          gap: 10px; 
        }

        .comment-input-wrapper input { 
          flex: 1; 
          padding: 10px 16px; 
          background: rgba(255,255,255,0.1); 
          border: 1px solid rgba(255,255,255,0.2); 
          border-radius: 25px; 
          color: white; 
          outline: none; 
        }

        .comment-input-wrapper button { 
          padding: 9px 20px; 
          background: linear-gradient(90deg, #3b82f6, #6366f1); 
          border: none; 
          border-radius: 25px; 
          color: white; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 6px; 
        }

        .btn-spinner { 
          width: 14px; 
          height: 14px; 
          border: 2px solid rgba(255,255,255,0.3); 
          border-top-color: white; 
          border-radius: 50%; 
          animation: spin 0.6s linear infinite; 
        }

        .login-to-comment { 
          text-align: center; 
          padding: 20px; 
          background: rgb(255, 255, 255); 
          border-radius: 12px; 
          margin-bottom: 20px; 
        }

        .comments-list-container {
          flex: 1;
          overflow-y: auto;
          max-height: 400px;
          padding-right: 4px;
          margin-bottom: 16px;
        }

        .comment-item {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .comment-content { flex: 1; }

        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 4px;
        }

        .comment-author {
          font-weight: 600;
          font-size: 12px;
          color: white;
        }

        .comment-date {
          font-size: 10px;
          color: rgba(255,255,255,0.4);
        }

        .comment-text {
          font-size: 12px;
          color: rgba(255,255,255,0.8);
          line-height: 1.4;
          word-break: break-word;
        }

        .comments-loading { 
          text-align: center; 
          padding: 40px 20px; 
          color: rgba(255,255,255,0.6); 
        }

        .spinner { 
          width: 30px; 
          height: 30px; 
          border: 2px solid rgba(255,255,255,0.2); 
          border-top-color: #3b82f6; 
          border-radius: 50%; 
          animation: spin 0.8s linear infinite; 
          margin: 0 auto 12px; 
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .load-more-comments { 
          width: 100%; 
          padding: 10px; 
          background: rgba(255,255,255,0.05); 
          border: 1px solid rgba(255,255,255,0.1); 
          border-radius: 25px; 
          color: rgba(255,255,255,0.7); 
          font-size: 12px; 
          cursor: pointer; 
          margin-top: 15px; 
        }

        .no-comments { 
          text-align: center; 
          padding: 40px 20px; 
          color: rgba(255,255,255,0.4); 
        }

        .share-modal { 
          position: fixed; 
          inset: 0; 
          z-index: 1100; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: rgba(0,0,0,0.8); 
          animation: fadeIn 0.2s ease; 
        }

        .share-modal-content { 
          background: #1a1a2e; 
          border-radius: 20px; 
          padding: 25px; 
          width: 400px; 
          max-width: 90%; 
          animation: scaleIn 0.2s ease; 
        }

        .share-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 20px; 
        }

        .share-url { 
          display: flex; 
          gap: 10px; 
          margin-bottom: 20px; 
        }

        .share-url input { 
          flex: 1; 
          padding: 10px; 
          background: rgba(255,255,255,0.1); 
          border: 1px solid rgba(255,255,255,0.2); 
          border-radius: 8px; 
          color: white; 
        }

        .share-url button { 
          padding: 8px 16px; 
          background: #3b82f6; 
          border: none; 
          border-radius: 8px; 
          color: white; 
          cursor: pointer; 
        }

        .share-platforms { 
          display: flex; 
          gap: 15px; 
        }

        .share-platforms button { 
          flex: 1; 
          padding: 10px; 
          border: none; 
          border-radius: 10px; 
          color: white; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 8px; 
        }

        .facebook { background: #1877f2; }
        .twitter { background: #1da1f2; }
        .instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }

        .save-toast { 
          position: fixed; 
          bottom: 20px; 
          left: 50%; 
          transform: translateX(-50%); 
          background: #333; 
          color: white; 
          padding: 12px 24px; 
          border-radius: 30px; 
          z-index: 1200; 
          animation: fadeInOut 2s ease; 
        }

        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
          15% { opacity: 1; transform: translateX(-50%) translateY(0); }
          85% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }

        @media (max-width: 768px) {
          .modal-body { flex-direction: column; min-height: auto; }
          .modal-media { max-height: 50vh; min-height: 300px; padding: 16px; }
          .modal-info { width: 100%; max-height: 50vh; overflow-y: auto; padding: 16px; border-left: none; border-top: 1px solid rgba(255,255,255,0.1); }
          .hero-title { font-size: 24px; }
          .media-grid.grid, .media-grid.compact { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
          .back-button { width: 38px; height: 38px; }
          .play-icon-wrapper {
            width: 60px;
            height: 60px;
          }
          .play-icon-wrapper svg {
            width: 32px;
            height: 32px;
          }
          .audio-player-container {
            padding: 16px;
          }
          .audio-artwork {
            width: 150px;
            height: 150px;
          }
          .audio-controls {
            flex-wrap: wrap;
          }
          .audio-progress-container {
            min-width: 150px;
            width: 100%;
            order: 1;
          }
        }
      `}</style>
    </div>
  );
}