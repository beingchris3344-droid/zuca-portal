import React, { useState, useEffect, useRef } from 'react';
import { api, publicApi } from '../api';
import {
  Heart, Eye, MessageCircle, X, Image as ImageIcon,
  Video, FileText, User, Clock, Share2, Download, Music2,
  Camera, TrendingUp, Award, Star, Zap, Users,
  Grid3x3, LayoutGrid, Play, Pause, Volume2, Maximize2,
  ThumbsUp, Bookmark, Share, Copy, Check, AlertCircle,
  VolumeX, Send, ArrowLeft, Sparkles, Compass
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/zuca-logo.png';

// Lazy Image Component with spinner
const LazyImage = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="lazy-image-container">
      {!isLoaded && isInView && (
        <div className="image-loader">
          <div className="loader-spinner"></div>
        </div>
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'loaded' : 'hidden'}`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
      )}
    </div>
  );
};

// Adaptive Media Player Component - Smooth playback, no buffering
const AdaptiveMediaPlayer = ({ src, thumbnailUrl, title, type = 'video', autoPlay = false }) => {
  const mediaRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (mediaRef.current && type === 'video') {
      mediaRef.current.preload = 'auto';
      mediaRef.current.load();
    }
  }, [src]);

  const handlePlayPause = () => {
    if (isReady) {
      if (isPlaying) {
        mediaRef.current?.pause();
      } else {
        mediaRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const current = mediaRef.current.currentTime;
      const dur = mediaRef.current.duration;
      if (dur && !isNaN(dur)) {
        setProgress((current / dur) * 100);
        setCurrentTime(current);
        setDuration(dur);
      }
    }
  };

  const handleCanPlayThrough = () => {
    setIsReady(true);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (type === 'audio') {
    return (
      <div className="audio-player-card">
        <div className="audio-artwork">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} />
          ) : (
            <Music2 size={48} />
          )}
        </div>
        <div className="audio-info">
          <h4>{title || 'Audio Track'}</h4>
          <div className="audio-controls">
            <button onClick={handlePlayPause} className="audio-play-btn">
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <div className="audio-progress">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="audio-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <button onClick={() => setIsMuted(!isMuted)} className="audio-volume-btn">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
        <audio
          ref={mediaRef}
          src={src}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onCanPlayThrough={handleCanPlayThrough}
        />
      </div>
    );
  }

  return (
    <div 
      className="video-player-card"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {!isPlaying && thumbnailUrl && (
        <div className="video-thumbnail" onClick={handlePlayPause}>
          <img src={thumbnailUrl} alt={title} />
          <div className="play-overlay">
            <div className="play-button-circle">
              <Play size={40} fill="white" />
            </div>
          </div>
        </div>
      )}
      
      <video
        ref={mediaRef}
        src={src}
        autoPlay={autoPlay}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onCanPlayThrough={handleCanPlayThrough}
        className="video-element"
        controls={isPlaying}
      />
    </div>
  );
};

export default function GalleryPage() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', mediaType: 'all', sortBy: 'latest' });
  const [user, setUser] = useState(null);
  const [likedMedia, setLikedMedia] = useState({});
  const [savedMedia, setSavedMedia] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trendingMedia, setTrendingMedia] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  
  const navigate = useNavigate();

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
        limit: 30
      });
      const res = await publicApi.get(`/api/media/public?${params}`);
      let fetchedMedia = res.data.media || [];
      
      if (filters.mediaType !== 'all') {
        fetchedMedia = fetchedMedia.filter(item => item.type === filters.mediaType);
      }
      
      setMedia(fetchedMedia);
      
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

  const handleLike = async (mediaId) => {
    if (!user) {
      alert('Please login to like');
      return;
    }
    
    const wasLiked = likedMedia[mediaId];
    const currentLikes = media.find(m => m.id === mediaId)?._count?.likes || 0;
    
    setLikedMedia(prev => ({ ...prev, [mediaId]: !wasLiked }));
    setMedia(prev => prev.map(m => 
      m.id === mediaId 
        ? { ...m, _count: { ...m._count, likes: wasLiked ? currentLikes - 1 : currentLikes + 1 } }
        : m
    ));
    if (selectedMedia?.id === mediaId) {
      setSelectedMedia(prev => ({
        ...prev,
        _count: { ...prev._count, likes: wasLiked ? (prev._count?.likes || 0) - 1 : (prev._count?.likes || 0) + 1 }
      }));
    }
    
    const likeBtn = document.getElementById(`like-${mediaId}`);
    if (likeBtn) {
      likeBtn.classList.add('animate-like');
      setTimeout(() => likeBtn.classList.remove('animate-like'), 300);
    }
    
    try {
      const res = await api.post(`/api/media/${mediaId}/like`);
      const data = res.data;
      
      if (data.liked !== !wasLiked) {
        setLikedMedia(prev => ({ ...prev, [mediaId]: data.liked }));
        setMedia(prev => prev.map(m => 
          m.id === mediaId 
            ? { ...m, _count: { ...m._count, likes: data.liked ? currentLikes + 1 : currentLikes - 1 } }
            : m
        ));
      }
    } catch (error) {
      console.error('Error liking:', error);
      setLikedMedia(prev => ({ ...prev, [mediaId]: wasLiked }));
      setMedia(prev => prev.map(m => 
        m.id === mediaId 
          ? { ...m, _count: { ...m._count, likes: wasLiked ? currentLikes + 1 : currentLikes - 1 } }
          : m
      ));
      if (selectedMedia?.id === mediaId) {
        setSelectedMedia(prev => ({
          ...prev,
          _count: { ...prev._count, likes: wasLiked ? (prev._count?.likes || 0) + 1 : (prev._count?.likes || 0) - 1 }
        }));
      }
      alert('Failed to like. Please try again.');
    }
  };

  const handleSave = (mediaId) => {
    if (!user) {
      alert('Please login to save');
      return;
    }
    setSavedMedia(prev => ({ ...prev, [mediaId]: !prev[mediaId] }));
  };

  // OPTIMISTIC COMMENT POSTING - Instant with loading indicator
  const handleComment = async () => {
    if (!comment.trim() || !selectedMedia || commentLoading) return;
    
    const commentText = comment.trim();
    const tempId = `temp-${Date.now()}`;
    
    const tempComment = {
      id: tempId,
      content: commentText,
      createdAt: new Date().toISOString(),
      user: user || { fullName: 'You', profileImage: null },
      isTemp: true
    };
    
    // Optimistic update - add comment instantly
    setComments(prev => [tempComment, ...prev]);
    setCommentsPagination(prev => ({ ...prev, total: prev.total + 1 }));
    setComment('');
    setCommentLoading(true);
    
    // Update comment count
    setMedia(prev => prev.map(m => 
      m.id === selectedMedia.id 
        ? { ...m, _count: { ...m._count, comments: (m._count?.comments || 0) + 1 } }
        : m
    ));
    setSelectedMedia(prev => ({
      ...prev,
      _count: { ...prev._count, comments: (prev._count?.comments || 0) + 1 }
    }));
    
    try {
      const res = await api.post(`/api/media/${selectedMedia.id}/comments`, { content: commentText });
      const newComment = res.data;
      setComments(prev => prev.map(c => c.id === tempId ? newComment : c));
    } catch (error) {
      console.error('Error commenting:', error);
      setComments(prev => prev.filter(c => c.id !== tempId));
      setCommentsPagination(prev => ({ ...prev, total: prev.total - 1 }));
      setMedia(prev => prev.map(m => 
        m.id === selectedMedia.id 
          ? { ...m, _count: { ...m._count, comments: (m._count?.comments || 0) - 1 } }
          : m
      ));
      setSelectedMedia(prev => ({
        ...prev,
        _count: { ...prev._count, comments: (prev._count?.comments || 0) - 1 }
      }));
      alert('Failed to post comment. Please try again.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleShare = async (media) => {
    const shareUrl = `${window.location.origin}/gallery?media=${media.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: media.title, url: shareUrl });
      } catch (err) {}
    } else {
      setShowShareModal(true);
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
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const goBack = () => navigate('/dashboard');

  const getMediaIcon = (type) => {
    switch(type) {
      case 'video': return <Video size={28} />;
      case 'audio': return <Music2 size={28} />;
      case 'document': return <FileText size={28} />;
      default: return <ImageIcon size={28} />;
    }
  };

  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  const timeAgo = (date) => formatDistance(new Date(date), new Date(), { addSuffix: true });

  const mediaTypeFilters = [
    { id: 'all', name: 'All', icon: Camera },
    { id: 'image', name: 'Images', icon: ImageIcon },
    { id: 'video', name: 'Videos', icon: Video },
    { id: 'audio', name: 'Audio', icon: Music2 }
  ];

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

        <style>{`
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
            background: #f8fafc;
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
            background: radial-gradient(circle, rgba(59,130,246,0.15), rgba(99,102,241,0.05));
          }

          .orb-2 {
            width: 400px;
            height: 400px;
            bottom: -150px;
            left: -150px;
            background: radial-gradient(circle, rgba(139,92,246,0.15), rgba(59,130,246,0.05));
            animation-delay: -5s;
          }

          .orb-3 {
            width: 600px;
            height: 600px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(6,182,212,0.1), rgba(59,130,246,0.03));
            animation-delay: -10s;
          }

          .orb-4 {
            width: 350px;
            height: 350px;
            top: 20%;
            right: 20%;
            background: radial-gradient(circle, rgba(245,158,11,0.1), rgba(139,92,246,0.05));
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
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 48px;
            border: 1px solid rgba(203, 213, 225, 0.3);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            animation: containerGlow 2s ease-in-out infinite;
          }

          @keyframes containerGlow {
            0%, 100% {
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
              border-color: rgba(203, 213, 225, 0.3);
            }
            50% {
              box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.2);
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

          .animate-like {
            animation: likeAnimation 0.3s ease;
          }

          @keyframes likeAnimation {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
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
            color: #3b82f6;
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
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
              filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
            }
            50% {
              transform: scale(1.05);
              filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.5));
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
            background: linear-gradient(135deg, #1e293b, #3b82f6, #8b5cf6);
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
            color: #64748b;
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
            color: #64748b;
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
            background: #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
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
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
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
            border-top: 1px solid #e2e8f0;
          }

          .quote-content {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #94a3b8;
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
      <div className="gallery-content">
        {/* Header with ZUCA Logo */}
        <div className="gallery-header">
          <div className="header-left">
            <button className="back-btn" onClick={goBack}>
              <ArrowLeft size={20} />
            </button>
            <div className="logo-area">
              <img src={logo} alt="ZUCA Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>
            <div>
              <h1>ZUCA Media Gallery</h1>
              <p>{media.length} memories • {trendingMedia.length} trending</p>
            </div>
          </div>
          <div className="header-right">
            <div className="view-toggle">
              <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                <LayoutGrid size={18} />
              </button>
              <button className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`} onClick={() => setViewMode('compact')}>
                <Grid3x3 size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Trending Section */}
        {trendingMedia.length > 0 && (
          <div className="trending-section">
            <div className="trending-header">
              <TrendingUp size={20} />
              <h2>Trending Now</h2>
              <span className="trending-badge">🔥 Hot</span>
            </div>
            <div className="trending-scroll">
              {trendingMedia.map((item) => (
                <div key={item.id} className="trending-card" onClick={() => handleSelectMedia(item)}>
                  <div className="trending-image">
                    {item.type === 'image' ? (
                      <LazyImage src={item.url} alt={item.title} />
                    ) : (
                      <div className="trending-placeholder">{getMediaIcon(item.type)}</div>
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
        <div className="filters-bar">
          <div className="filter-group">
            <span className="filter-label">Media Type:</span>
            <div className="categories">
              {mediaTypeFilters.map(filter => {
                const Icon = filter.icon;
                return (
                  <button 
                    key={filter.id} 
                    onClick={() => setFilters({ ...filters, mediaType: filter.id })} 
                    className={`category-btn ${filters.mediaType === filter.id ? 'active' : ''}`}
                  >
                    <Icon size={16} />
                    <span>{filter.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="filter-group">
            <span className="filter-label">Category:</span>
            <div className="categories">
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
          </div>
          
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

        {/* Media Grid */}
        <div className={`media-grid ${viewMode}`}>
          {media.map((item, index) => (
            <div 
              key={item.id} 
              className="media-card" 
              onClick={() => handleSelectMedia(item)}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="card-image-wrapper">
                {item.type === 'image' ? (
                  <LazyImage src={item.url} alt={item.title} className="card-image" />
                ) : item.type === 'video' ? (
                  <div className="video-preview">
                    {item.thumbnailUrl ? (
                      <LazyImage src={item.thumbnailUrl} alt={item.title} className="card-image" />
                    ) : (
                      <div className="media-placeholder">{getMediaIcon(item.type)}</div>
                    )}
                    <div className="play-indicator"><Play size={24} /></div>
                  </div>
                ) : item.type === 'audio' ? (
                  <div className="audio-preview">
                    {item.thumbnailUrl ? (
                      <LazyImage src={item.thumbnailUrl} alt={item.title} className="card-image" />
                    ) : (
                      <div className="media-placeholder">{getMediaIcon(item.type)}</div>
                    )}
                    <div className="play-indicator"><Play size={24} /></div>
                  </div>
                ) : (
                  <div className="media-placeholder">{getMediaIcon(item.type)}</div>
                )}
                
                {item.isFeatured && (
                  <div className="featured-badge">
                    <Star size={10} /> Featured
                  </div>
                )}
                <button 
                  className={`save-btn ${savedMedia[item.id] ? 'saved' : ''}`} 
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
                    <Heart size={12} /> {item._count?.likes || 0}
                  </button>
                  <div className="stat"><Eye size={12} /> {item._count?.views || 0}</div>
                  <div className="stat"><MessageCircle size={12} /> {item._count?.comments || 0}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {media.length === 0 && (
          <div className="empty-state">
            <Camera size={64} />
            <h3>No media yet</h3>
            <p>Be the first to share memories from our community</p>
          </div>
        )}
      </div>

      {/* Media Modal */}
      {selectedMedia && (
        <div className="media-modal" onClick={() => setSelectedMedia(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-close" onClick={() => setSelectedMedia(null)}>
                <X size={24} />
              </button>
              <h2>{selectedMedia.title}</h2>
              <div className="modal-actions">
                <button onClick={() => handleSave(selectedMedia.id)}><Bookmark size={20} className={savedMedia[selectedMedia.id] ? 'saved' : ''} /></button>
                <button onClick={() => handleShare(selectedMedia)}><Share2 size={20} /></button>
                <button onClick={() => handleDownload(selectedMedia)}><Download size={20} /></button>
              </div>
            </div>
            
            <div className="modal-body">
              <div className="modal-media-wrapper">
                {selectedMedia.type === 'image' ? (
                  <div className="image-container">
                    <img src={selectedMedia.url} alt={selectedMedia.title} />
                  </div>
                ) : (
                  <AdaptiveMediaPlayer 
                    src={selectedMedia.url} 
                    thumbnailUrl={selectedMedia.thumbnailUrl}
                    title={selectedMedia.title}
                    type={selectedMedia.type}
                    autoPlay={true}
                  />
                )}
              </div>
              
              <div className="modal-info">
                {selectedMedia.description && (
                  <p className="modal-description">{selectedMedia.description}</p>
                )}
                
                <div className="modal-stats">
                  <button 
                    id={`like-${selectedMedia.id}`}
                    className={`stat-large ${likedMedia[selectedMedia.id] ? 'liked' : ''}`} 
                    onClick={() => handleLike(selectedMedia.id)}
                  >
                    <ThumbsUp size={18} /> {selectedMedia._count?.likes || 0} Likes
                  </button>
                  <div className="stat-large"><Eye size={18} /> {selectedMedia._count?.views || 0} Views</div>
                  <div className="stat-large"><MessageCircle size={18} /> {selectedMedia._count?.comments || 0} Comments</div>
                </div>
                
                <div className="modal-meta">
                  <span>📅 {formatDate(selectedMedia.createdAt)}</span>
                  <span>👤 {selectedMedia.uploadedBy?.fullName || 'Anonymous'}</span>
                </div>
                
                <div className="comments-section">
                  <h3><MessageCircle size={18} /> Comments ({commentsPagination.total})</h3>
                  
                  {user ? (
                    <div className="comment-input">
                      <input 
                        type="text" 
                        value={comment} 
                        onChange={(e) => setComment(e.target.value)} 
                        placeholder={commentLoading ? "Posting comment..." : "Add a comment..."}
                        onKeyPress={(e) => e.key === 'Enter' && !commentLoading && handleComment()} 
                        disabled={commentLoading}
                      />
                      <button onClick={handleComment} disabled={!comment.trim() || commentLoading}>
                        {commentLoading ? (
                          <>
                            <div className="btn-spinner-small"></div>
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send size={14} /> Post
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="login-prompt">Please <a href="/login">login</a> to comment</div>
                  )}
                  
                  <div className="comments-list">
                    {comments.map((c) => (
                      <div key={c.id} className="comment-item">
                        <div className="comment-avatar">
                          <div className="avatar-placeholder">{c.user?.fullName?.charAt(0) || 'A'}</div>
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <span className="comment-author">{c.user?.fullName || 'Anonymous'}</span>
                            <span className="comment-date">{timeAgo(c.createdAt)}</span>
                          </div>
                          <p>{c.content}</p>
                        </div>
                      </div>
                    ))}
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
            <h3>Share this media</h3>
            <div className="share-url">
              <input type="text" value={`${window.location.origin}/gallery?media=${selectedMedia?.id}`} readOnly />
              <button onClick={() => copyToClipboard(`${window.location.origin}/gallery?media=${selectedMedia?.id}`)}>
                {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .gallery-container {
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .content-fade-in {
          animation: contentFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .gallery-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .back-btn {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: white;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
        }

        .back-btn:hover {
          background: #f1f5f9;
          transform: translateX(-2px);
        }

        .logo-area {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .header-left h1 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .header-left p {
          font-size: 13px;
          color: #64748b;
        }

        .view-toggle {
          display: flex;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 4px;
        }

        .view-btn {
          padding: 8px 12px;
          border-radius: 8px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          transition: all 0.2s;
        }

        .view-btn.active {
          background: #3b82f6;
          color: white;
        }

        .trending-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 28px;
          border: 1px solid #e2e8f0;
        }

        .trending-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .trending-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }

        .trending-badge {
          padding: 2px 8px;
          background: #fef3c7;
          border-radius: 12px;
          color: #d97706;
          font-size: 11px;
          font-weight: 600;
        }

        .trending-scroll {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .trending-scroll::-webkit-scrollbar {
          height: 6px;
        }

        .trending-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        .trending-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        .trending-card {
          min-width: 180px;
          background: #f8fafc;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #e2e8f0;
        }

        .trending-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }

        .trending-image {
          position: relative;
          aspect-ratio: 16/9;
          background: #e2e8f0;
        }

        .trending-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .trending-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .trending-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .trending-card:hover .trending-overlay {
          opacity: 1;
        }

        .trending-info {
          padding: 10px;
        }

        .trending-info h4 {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .trending-stats {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #64748b;
        }

        .trending-stats span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .filters-bar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 28px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }

        .categories {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .category-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          color: #475569;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-btn:hover {
          background: #f1f5f9;
        }

        .category-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .sort-select {
          align-self: flex-end;
          padding: 6px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          color: #1e293b;
          font-size: 13px;
          cursor: pointer;
        }

        .media-grid {
          display: grid;
          gap: 20px;
        }

        .media-grid.grid {
          grid-template-columns: repeat(4, 1fr);
        }

        .media-grid.compact {
          grid-template-columns: repeat(5, 1fr);
        }

        @media (max-width: 1200px) {
          .media-grid.grid { grid-template-columns: repeat(3, 1fr); }
          .media-grid.compact { grid-template-columns: repeat(4, 1fr); }
        }

        @media (max-width: 900px) {
          .media-grid.grid { grid-template-columns: repeat(2, 1fr); }
          .media-grid.compact { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 600px) {
          .media-grid.grid, .media-grid.compact { grid-template-columns: repeat(2, 1fr); }
        }

        .media-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
          animation: fadeInUp 0.4s ease forwards;
          opacity: 0;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .media-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          border-color: #cbd5e1;
        }

        .card-image-wrapper {
          position: relative;
          aspect-ratio: 1/1;
          background: #f1f5f9;
          overflow: hidden;
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .media-card:hover .card-image {
          transform: scale(1.05);
        }

        .video-preview, .audio-preview {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .media-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #e2e8f0, #f1f5f9);
          color: #94a3b8;
        }

        .play-indicator {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .video-preview:hover .play-indicator,
        .audio-preview:hover .play-indicator {
          opacity: 1;
        }

        .featured-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 3px 8px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 16px;
          color: white;
          font-size: 9px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .save-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          background: rgba(0,0,0,0.5);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }

        .save-btn:hover {
          transform: scale(1.05);
        }

        .save-btn.saved {
          color: #f59e0b;
        }

        .card-info {
          padding: 10px;
        }

        .card-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-stats {
          display: flex;
          gap: 12px;
        }

        .stat-btn, .stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #64748b;
          background: none;
          border: none;
          cursor: pointer;
        }

        .stat-btn.liked {
          color: #ef4444;
        }

        .lazy-image-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .image-loader {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
        }

        .loader-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        img.hidden {
          opacity: 0;
        }

        img.loaded {
          opacity: 1;
          transition: opacity 0.3s ease;
        }

        .btn-spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          margin-right: 6px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
        }

        .empty-state svg {
          color: #cbd5e1;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-size: 18px;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .empty-state p {
          color: #64748b;
        }

        .media-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          z-index: 1000;
          display: flex;
          margin-top: -80px;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-container {
          width: 90vw;
          max-width: 1200px;
          height: 85vh;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .modal-close {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #f1f5f9;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: #e2e8f0;
          transform: rotate(90deg);
        }

        .modal-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          flex: 1;
          margin: 0 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .modal-actions button {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
          padding: 4px;
          border-radius: 6px;
        }

        .modal-actions button:hover {
          color: #3b82f6;
          background: #f1f5f9;
        }

        .modal-body {
          display: flex;
          flex-direction: row;
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }

        .modal-media-wrapper {
          flex: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
          padding: 0;
          overflow: hidden;
          min-width: 0;
        }

        .image-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-container img {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          display: block;
        }

        .video-player-card {
          width: 100%;
          height: 100%;
          background: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-thumbnail {
          position: relative;
          cursor: pointer;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-thumbnail img {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
        }

        .play-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          transition: all 0.2s;
        }

        .play-overlay:hover {
          background: rgba(0,0,0,0.5);
        }

        .play-button-circle {
          width: 80px;
          height: 80px;
          background: rgba(59, 130, 246, 0.9);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          backdrop-filter: blur(4px);
        }

        .play-button-circle:hover {
          transform: scale(1.1);
          background: #3b82f6;
        }

        .video-element {
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
        }

        .audio-player-card {
          width: 100%;
          max-width: 450px;
          margin: 0 auto;
          background: #f8fafc;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .audio-artwork {
          width: 150px;
          height: 150px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .audio-artwork img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 16px;
        }

        .audio-info {
          width: 100%;
          text-align: center;
        }

        .audio-info h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
        }

        .audio-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .audio-play-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #3b82f6;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        }

        .audio-play-btn:hover {
          transform: scale(1.05);
          background: #2563eb;
        }

        .audio-progress {
          flex: 1;
          min-width: 180px;
        }

        .progress-track {
          height: 4px;
          background: #e2e8f0;
          border-radius: 2px;
          cursor: pointer;
          margin-bottom: 6px;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 2px;
          width: 0%;
          transition: width 0.1s linear;
        }

        .audio-time {
          font-size: 11px;
          color: #64748b;
          font-family: monospace;
        }

        .audio-volume-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 8px;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .audio-volume-btn:hover {
          background: #e2e8f0;
        }

        .modal-info {
          width: 340px;
          padding: 20px;
          overflow-y: auto;
          border-left: 1px solid #e2e8f0;
          flex-shrink: 0;
          background: white;
        }

        .modal-description {
          color: #475569;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .modal-stats {
          display: flex;
          gap: 20px;
          padding: 12px 0;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 16px;
        }

        .stat-large {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #475569;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .stat-large:hover {
          background: #f1f5f9;
        }

        .stat-large.liked {
          color: #ef4444;
        }

        .modal-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 11px;
          color: #64748b;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .comments-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .comment-input {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }

        .comment-input input {
          flex: 1;
          padding: 8px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          outline: none;
          font-size: 12px;
          transition: border-color 0.2s;
        }

        .comment-input input:focus {
          border-color: #3b82f6;
        }

        .comment-input input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .comment-input button {
          padding: 6px 16px;
          background: #3b82f6;
          border: none;
          border-radius: 24px;
          color: white;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .comment-input button:hover:not(:disabled) {
          background: #2563eb;
        }

        .comment-input button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-prompt {
          text-align: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 12px;
          color: #64748b;
        }

        .login-prompt a {
          color: #3b82f6;
          text-decoration: none;
        }

        .comments-list {
          max-height: 300px;
          overflow-y: auto;
        }

        .comment-item {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
          padding: 8px;
          border-radius: 12px;
          transition: background 0.2s;
        }

        .comment-item:hover {
          background: #f8fafc;
        }

        .comment-avatar {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
        }

        .avatar-placeholder {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 600;
        }

        .comment-content {
          flex: 1;
        }

        .comment-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          flex-wrap: wrap;
          gap: 4px;
        }

        .comment-author {
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
        }

        .comment-date {
          font-size: 10px;
          color: #94a3b8;
        }

        .comment-content p {
          font-size: 12px;
          color: #475569;
          line-height: 1.4;
        }

        .share-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .share-modal-content {
          background: white;
          border-radius: 16px;
          padding: 20px;
          width: 360px;
          max-width: 90%;
        }

        .share-modal-content h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 16px;
        }

        .share-url {
          display: flex;
          gap: 10px;
        }

        .share-url input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 11px;
        }

        .share-url button {
          padding: 8px 14px;
          background: #3b82f6;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .media-modal {
            padding: 0;
             padding-top: 50px;
          }
          
          .modal-container {
            width: 100vw;
            height: 100vh;
            border-radius: 0;
          }
          
          .modal-body {
            flex-direction: column;
          }
          
          .modal-media-wrapper {
            flex: 1;
            max-height: 55vh;
          }
          
          .modal-info {
            width: 100%;
            max-height: 45vh;
            border-left: none;
            border-top: 1px solid #e2e8f0;
          }
          
          .image-container img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
          }
          
          .video-element {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
          }
          
          .audio-player-card {
            padding: 16px;
          }
          
          .audio-artwork {
            width: 100px;
            height: 100px;
          }
          
          .audio-progress {
            min-width: 120px;
          }
          
          .gallery-content {
            padding: 16px;
          }
          
          .filter-group {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .sort-select {
            align-self: stretch;
          }
        }
      `}</style>
    </div>
  );
}