// frontend/src/pages/admin/AdminMediaPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import {
  Heart, Eye, MessageCircle, X, Image as ImageIcon,
  Video, FileText, User, Clock, Share2, Download, Music2,
  Camera, TrendingUp, Award, Star, Zap, Users,
  Grid3x3, LayoutGrid, Play, Pause, Volume2, Maximize2,
  ThumbsUp, Bookmark, Share, Copy, Check, AlertCircle,
  VolumeX, Send, ArrowLeft, Sparkles, Compass,
  Upload, Trash2, Edit2, Search, RefreshCw, Plus
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// ==================== THUMBNAIL GENERATOR ====================
const generateVideoThumbnail = (videoFile) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(video.duration * 0.3, 5);
    });
    
    video.addEventListener('seeked', () => {
      canvas.width = 640;
      canvas.height = 360;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const gradient = ctx.createLinearGradient(0, canvas.height - 50, 0, canvas.height);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 35, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 + 8, canvas.height / 2 - 12);
      ctx.lineTo(canvas.width / 2 + 8, canvas.height / 2 + 12);
      ctx.lineTo(canvas.width / 2 + 22, canvas.height / 2);
      ctx.fill();
      
      const mins = Math.floor(video.duration / 60);
      const secs = Math.floor(video.duration % 60);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = 'white';
      ctx.shadowBlur = 4;
      ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, canvas.width - 50, canvas.height - 15);
      
      resolve(canvas.toDataURL('image/jpeg', 0.85));
      video.remove();
      canvas.remove();
    });
    
    video.addEventListener('error', reject);
    video.src = URL.createObjectURL(videoFile);
    video.addEventListener('loadeddata', () => URL.revokeObjectURL(video.src));
  });
};

// ==================== LAZY IMAGE COMPONENT ====================
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

// ==================== ADAPTIVE MEDIA PLAYER ====================
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

export default function AdminMediaPage() {
  const navigate = useNavigate();
  
  // Media state
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [user, setUser] = useState(null);
  const [likedMedia, setLikedMedia] = useState({});
  const [savedMedia, setSavedMedia] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({ category: 'all', mediaType: 'all', sortBy: 'latest' });
  
  // Admin specific state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [category, setCategory] = useState('uncategorized');
  const [isPublic, setIsPublic] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [description, setDescription] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Comments and likes
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPagination, setCommentsPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Loading stages
  useEffect(() => {
    if (loading) {
      const stages = [
        { progress: 15, message: "Loading media library...", icon: "📸", description: "Fetching your media" },
        { progress: 35, message: "Organizing content...", icon: "🎨", description: "Sorting by categories" },
        { progress: 55, message: "Preparing thumbnails...", icon: "🖼️", description: "Optimizing images" },
        { progress: 75, message: "Almost ready...", icon: "✨", description: "Final touches" },
        { progress: 100, message: "Ready!", icon: "🎉", description: "Media library ready" }
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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/api/me')
        .then(res => setUser(res.data))
        .catch(() => {});
    }
    fetchMedia();
    fetchStats();
  }, [filters, search]);

  const fetchMedia = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingStage(0);
    setShowContent(false);
    
    try {
      const params = new URLSearchParams({
        category: filters.category,
        sortBy: filters.sortBy,
        mediaType: filters.mediaType,
        search: search,
        limit: 30
      });
      const res = await api.get(`/api/admin/media?${params}`);
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

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/admin/media/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchComments = async (mediaId, page = 1) => {
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/media/${mediaId}/comments?page=${page}&limit=20`);
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
    
    try {
      await api.post(`/api/media/${mediaId}/like`);
    } catch (error) {
      console.error('Error liking:', error);
      setLikedMedia(prev => ({ ...prev, [mediaId]: wasLiked }));
      setMedia(prev => prev.map(m => 
        m.id === mediaId 
          ? { ...m, _count: { ...m._count, likes: wasLiked ? currentLikes + 1 : currentLikes - 1 } }
          : m
      ));
    }
  };

  const handleSave = (mediaId) => {
    if (!user) {
      alert('Please login to save');
      return;
    }
    setSavedMedia(prev => ({ ...prev, [mediaId]: !prev[mediaId] }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    const previews = files.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      size: formatFileSize(file.size),
      name: file.name,
      type: file.type.split('/')[0]
    }));
    setFilePreviews(previews);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      formData.append('files', file);
      
      if (file.type.startsWith('video/')) {
        try {
          const thumbnail = await generateVideoThumbnail(file);
          const blob = await (await fetch(thumbnail)).blob();
          formData.append('thumbnails', blob, `${file.name}_thumb.jpg`);
        } catch (error) {
          console.error('Thumbnail generation failed:', error);
        }
      }
    }
    
    formData.append('category', category);
    formData.append('isPublic', isPublic.toString());
    formData.append('isFeatured', isFeatured.toString());
    if (description) formData.append('description', description);
    
    try {
      const res = await api.post('/api/admin/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });
      
      if (res.data.success) {
        filePreviews.forEach(p => { if (p.preview) URL.revokeObjectURL(p.preview); });
        setSelectedFiles([]);
        setFilePreviews([]);
        setDescription('');
        fetchMedia();
        fetchStats();
        showToast('Upload successful!', 'success');
      }
    } catch (error) {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/admin/media/${id}`);
      fetchMedia();
      fetchStats();
      setShowDeleteConfirm(null);
      showToast('Media deleted', 'success');
    } catch (error) {
      showToast('Delete failed', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForBulk.length === 0) return;
    try {
      await api.post('/api/admin/media/bulk-delete', { ids: selectedForBulk });
      setSelectedForBulk([]);
      setShowBulkDeleteConfirm(false);
      fetchMedia();
      fetchStats();
      showToast(`${selectedForBulk.length} items deleted`, 'success');
    } catch (error) {
      showToast('Bulk delete failed', 'error');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await api.put(`/api/admin/media/${id}`, data);
      setEditingItem(null);
      fetchMedia();
      showToast('Media updated', 'success');
    } catch (error) {
      showToast('Update failed', 'error');
    }
  };

  const toggleBulkSelect = (id) => {
    setSelectedForBulk(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const goBack = () => navigate('/dashboard');

  const getMediaIcon = (type) => {
    switch(type) {
      case 'video': return <Video size={28} />;
      case 'audio': return <Music2 size={28} />;
      default: return <ImageIcon size={28} />;
    }
  };

  const formatDate = (date) => format(new Date(date), 'MMM d, yyyy');
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
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
    { progress: 15, message: "Loading media library...", icon: "📸", description: "Fetching your media" },
    { progress: 35, message: "Organizing content...", icon: "🎨", description: "Sorting by categories" },
    { progress: 55, message: "Preparing thumbnails...", icon: "🖼️", description: "Optimizing images" },
    { progress: 75, message: "Almost ready...", icon: "✨", description: "Final touches" },
    { progress: 100, message: "Ready!", icon: "🎉", description: "Media library ready" }
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
                <span className="progress-text">Loading media library</span>
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
                <span>Managing your media library</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-media-page ${showContent ? 'content-fade-in' : ''}`}>
      <div className="admin-media-content">
        {/* Header with Back Button */}
        <div className="admin-header">
          <div className="header-left">
            <button className="back-btn" onClick={goBack}>
              <ArrowLeft size={20} />
            </button>
            <div className="logo-area">
              <Camera size={24} />
            </div>
            <div>
              <h1>Media Management</h1>
              <p>{media.length} items • Admin controls</p>
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

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card"><Camera size={18} /> {stats?.totalMedia || 0} Media</div>
          <div className="stat-card"><Eye size={18} /> {(stats?.totalViews || 0).toLocaleString()} Views</div>
          <div className="stat-card"><Heart size={18} /> {(stats?.totalLikes || 0).toLocaleString()} Likes</div>
          <div className="stat-card"><MessageCircle size={18} /> {(stats?.totalComments || 0).toLocaleString()} Comments</div>
        </div>

        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-header"><Upload size={18} /><h3>Upload New Media</h3></div>
          <div className="upload-area">
            <input type="file" multiple onChange={handleFileSelect} id="file-input" accept="image/*,video/*,audio/*" />
            <label htmlFor="file-input" className="upload-label">
              <Plus size={32} />
              <span>Click to select files</span>
              <small>Images, videos, audio (max 2GB)</small>
            </label>
            
            {filePreviews.length > 0 && (
              <div className="preview-section">
                <div className="preview-header">
                  <span>{filePreviews.length} file(s) selected</span>
                  <button onClick={() => { setSelectedFiles([]); filePreviews.forEach(p => { if (p.preview) URL.revokeObjectURL(p.preview); }); setFilePreviews([]); }} className="clear-btn">
                    <X size={14} /> Clear
                  </button>
                </div>
                <div className="preview-grid">
                  {filePreviews.map((file, idx) => (
                    <div key={idx} className="preview-item">
                      {file.preview ? <img src={file.preview} /> : <div className="preview-placeholder">{getMediaIcon(file.type)}</div>}
                      <div className="preview-name">{file.name.substring(0, 15)}</div>
                    </div>
                  ))}
                </div>
                <div className="upload-options">
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="uncategorized">Select Category</option>
                    <option value="mass">Holy Mass</option>
                    <option value="fellowship">Fellowship</option>
                    <option value="outreach">Outreach</option>
                    <option value="events">Events</option>
                    <option value="retreat">Retreats</option>
                  </select>
                  <label><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Public</label>
                  <label><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} /> Featured</label>
                  <input type="text" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                  {uploading && (
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                      <span className="progress-text">{uploadProgress}%</span>
                    </div>
                  )}
                  <button className="upload-btn" onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedForBulk.length > 0 && (
          <div className="bulk-bar">
            <span>{selectedForBulk.length} selected</span>
            <button onClick={() => setShowBulkDeleteConfirm(true)} className="delete-btn">Delete Selected</button>
            <button onClick={() => setSelectedForBulk([])}>Cancel</button>
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
          
          <div className="search-wrapper">
            <Search size={14} />
            <input 
              type="text" 
              placeholder="Search media..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          
          <button className="refresh-btn" onClick={() => { fetchMedia(); fetchStats(); }}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          </button>
        </div>

        {/* Media Grid - Same as GalleryPage */}
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
                <div className="admin-checkbox">
                  <input 
                    type="checkbox" 
                    checked={selectedForBulk.includes(item.id)} 
                    onChange={(e) => { e.stopPropagation(); toggleBulkSelect(item.id); }} 
                  />
                </div>
                <button 
                  className={`save-btn ${savedMedia[item.id] ? 'saved' : ''}`} 
                  onClick={(e) => { e.stopPropagation(); handleSave(item.id); }}
                >
                  <Bookmark size={12} />
                </button>
              </div>
              
              <div className="card-info">
                <div className="card-title-row">
                  {editingItem === item.id ? (
                    <input 
                      type="text" 
                      defaultValue={item.title} 
                      onBlur={(e) => handleUpdate(item.id, { title: e.target.value })} 
                      autoFocus 
                      className="edit-title-input"
                    />
                  ) : (
                    <h3 className="card-title">{item.title}</h3>
                  )}
                  <div className="admin-actions">
                    <button onClick={(e) => { e.stopPropagation(); setEditingItem(editingItem === item.id ? null : item.id); }}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(item.id); }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="card-stats">
                  <button 
                    className={`stat-btn ${likedMedia[item.id] ? 'liked' : ''}`} 
                    onClick={(e) => { e.stopPropagation(); handleLike(item.id); }}
                  >
                    <Heart size={12} /> {item._count?.likes || 0}
                  </button>
                  <div className="stat"><Eye size={12} /> {item._count?.views || 0}</div>
                  <div className="stat"><MessageCircle size={12} /> {item._count?.comments || 0}</div>
                </div>
                <div className="card-meta">
                  <span className="category-tag">{item.category}</span>
                  <span>{formatFileSize(item.size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {media.length === 0 && (
          <div className="empty-state">
            <Camera size={64} />
            <h3>No media found</h3>
            <p>Upload your first media file</p>
          </div>
        )}
      </div>

      {/* Media Modal - Same as GalleryPage */}
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
                <button onClick={() => handleDelete(selectedMedia.id)}><Trash2 size={20} /></button>
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
                  <span>📁 {selectedMedia.category}</span>
                </div>
                
                <div className="comments-section">
                  <h3><MessageCircle size={18} /> Comments ({commentsPagination.total})</h3>
                  
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

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <AlertCircle size={40} />
            <h3>Delete Media</h3>
            <p>This action cannot be undone.</p>
            <div className="confirm-buttons">
              <button onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {showBulkDeleteConfirm && (
        <div className="confirm-overlay" onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <AlertCircle size={40} />
            <h3>Delete {selectedForBulk.length} Items</h3>
            <p>This action cannot be undone.</p>
            <div className="confirm-buttons">
              <button onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</button>
              <button onClick={handleBulkDelete}>Delete All</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Same styles as GalleryPage plus admin additions */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .admin-media-page {
          min-height: 100vh;
          margin-top: 50px;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-y: auto;
          scroll-behavior: smooth;
        }

        /* Custom scrollbar */
        .admin-media-page::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .admin-media-page::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .admin-media-page::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .admin-media-page::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .content-fade-in {
          animation: contentFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes contentFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .admin-media-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        /* Premium Loading Screen - Same as GalleryPage */
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
          z-index: 1000;
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

        .orb-1 { width: 500px; height: 500px; top: -200px; right: -200px; background: radial-gradient(circle, rgba(59,130,246,0.15), rgba(99,102,241,0.05)); }
        .orb-2 { width: 400px; height: 400px; bottom: -150px; left: -150px; background: radial-gradient(circle, rgba(139,92,246,0.15), rgba(59,130,246,0.05)); animation-delay: -5s; }
        .orb-3 { width: 600px; height: 600px; top: 50%; left: 50%; transform: translate(-50%, -50%); background: radial-gradient(circle, rgba(6,182,212,0.1), rgba(59,130,246,0.03)); animation-delay: -10s; }
        .orb-4 { width: 350px; height: 350px; top: 20%; right: 20%; background: radial-gradient(circle, rgba(245,158,11,0.1), rgba(139,92,246,0.05)); animation-delay: -15s; }

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
          0%, 100% { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); border-color: rgba(203, 213, 225, 0.3); }
          50% { box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.3); }
        }

        .loading-content-wrapper {
          padding: 60px 80px;
          text-align: center;
          min-width: 500px;
        }

        .logo-animation {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 40px;
        }

        .logo-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          animation: ringPulse 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }

        .ring-1 { border-top-color: #3b82f6; border-right-color: #3b82f6; }
        .ring-2 { border-bottom-color: #8b5cf6; border-left-color: #8b5cf6; animation-delay: 0.3s; width: 90%; height: 90%; top: 5%; left: 5%; }

        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
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
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.5)); }
        }

        @keyframes sparkleRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
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
        }

        /* Header */
        .admin-header {
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

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #1e293b;
          font-weight: 600;
          font-size: 14px;
        }

        /* Upload Section */
        .upload-section {
          background: white;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }

        .upload-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          color: #1e293b;
        }

        .upload-header h3 {
          font-size: 16px;
          margin: 0;
        }

        .upload-area {
          border: 2px dashed #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          background: #fafbfc;
        }

        #file-input {
          display: none;
        }

        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: #3b82f6;
        }

        .upload-label small {
          color: #94a3b8;
          font-size: 11px;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          gap: 10px;
          margin: 16px 0;
        }

        .preview-item {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          text-align: center;
        }

        .preview-item img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
        }

        .preview-name {
          font-size: 9px;
          color: #1e293b;
          padding: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .upload-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }

        .upload-options select,
        .upload-options input {
          padding: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #1e293b;
        }

        .upload-options label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #475569;
          font-size: 13px;
          cursor: pointer;
        }

        .progress-bar-container {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          transition: width 0.3s;
        }

        .upload-btn {
          padding: 12px;
          background: linear-gradient(90deg, #3b82f6, #6366f1);
          border: none;
          border-radius: 25px;
          color: white;
          font-weight: 500;
          cursor: pointer;
        }

        /* Bulk Bar */
        .bulk-bar {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: #1e293b;
          flex-wrap: wrap;
        }

        .bulk-bar button {
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 6px 12px;
          border-radius: 8px;
          color: #ef4444;
          cursor: pointer;
        }

        /* Filters */
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

        .search-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          padding: 8px 16px;
          flex: 1;
          max-width: 300px;
        }

        .search-wrapper input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
        }

        .refresh-btn {
          padding: 8px;
          border-radius: 30px;
          background: white;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Media Grid - Same as GalleryPage */
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

        .admin-checkbox {
          position: absolute;
          top: 8px;
          right: 40px;
          background: rgba(0,0,0,0.5);
          border-radius: 6px;
          padding: 4px;
          backdrop-filter: blur(4px);
        }

        .admin-checkbox input {
          width: 16px;
          height: 16px;
          cursor: pointer;
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

        .card-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .card-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }

        .edit-title-input {
          font-size: 12px;
          padding: 4px 6px;
          border: 1px solid #3b82f6;
          border-radius: 6px;
          outline: none;
          flex: 1;
          margin-right: 8px;
        }

        .admin-actions {
          display: flex;
          gap: 6px;
        }

        .admin-actions button {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .admin-actions button:hover {
          background: #e2e8f0;
        }

        .card-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 6px;
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

        .card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9px;
          color: #94a3b8;
        }

        .category-tag {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 10px;
        }

        /* Lazy Image */
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

        /* Modal - Same as GalleryPage */
        .media-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 99999;
  display: flex;
  align-items: flex-start; /* Change from 'center' to 'flex-start' */
  justify-content: center;
  padding: 20px;
  padding-top: 80px; /* Add this - gives space for the header */
  overflow-y: auto; /* Allow scrolling if content is tall */
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

        /* Confirm Overlay */
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .confirm-box {
          background: white;
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          max-width: 300px;
          width: 90%;
        }

        .confirm-box svg {
          color: #ef4444;
          margin-bottom: 16px;
        }

        .confirm-box h3 {
          color: #1e293b;
          margin-bottom: 8px;
          font-size: 18px;
        }

        .confirm-box p {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 20px;
        }

        .confirm-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .confirm-buttons button {
          padding: 8px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 12px;
        }

        .confirm-buttons button:first-child {
          background: #f1f5f9;
          color: #64748b;
          border: none;
        }

        .confirm-buttons button:last-child {
          background: #ef4444;
          color: white;
          border: none;
        }

        /* Empty State */
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

        /* Toast */
        .toast-message {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 25px;
          color: white;
          z-index: 2000;
          animation: fadeOut 3s ease;
          font-size: 13px;
        }

        .toast-message.success {
          background: #10b981;
        }

        .toast-message.error {
          background: #ef4444;
        }

        @keyframes fadeOut {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-media-content {
            padding: 16px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
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
          
          .filter-group {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .search-wrapper {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}