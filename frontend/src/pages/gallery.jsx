// frontend/src/pages/gallery.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  FiImage, FiVideo, FiMusic, FiHeart, FiMessageCircle, 
  FiShare2, FiEye, FiDownload, FiPlay, FiPause, 
  FiVolume2, FiVolumeX, FiMaximize2, FiMinimize2, FiRepeat,
  FiSearch, FiFilter, FiGrid, FiList, FiChevronLeft, 
  FiChevronRight, FiX, FiSend, FiTrash2, FiStar,
  FiTrendingUp, FiClock, FiUser, FiTag, FiFolder, FiSun, FiMoon,
  FiChevronDown, FiMoreVertical, FiCopy, FiFlag, FiPlus,
  FiSkipBack, FiSkipForward, FiCast, FiPrinter, FiImage as FiImageIcon,
  FiGrid as FiGridIcon, FiList as FiListIcon, FiHeart as FiHeartIcon,
  FiMessageSquare, FiShare, FiDownload as FiDownloadIcon,
  FiZoomIn, FiZoomOut, FiRotateCw, FiSettings, FiMenu
} from "react-icons/fi";
import { FaWhatsapp, FaFacebook, FaTwitter, FaInstagram, FaSnapchat, FaQrcode } from "react-icons/fa";
import axios from "axios";
import BASE_URL from "../api";
import { toast, Toaster } from "react-hot-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QRCode from "qrcode";


function Gallery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: true
  });
  const [filters, setFilters] = useState({
    type: "all",
    category: "all",
    search: "",
    sortBy: "latest",
    dateRange: "all"
  });
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('galleryViewMode') || 'grid';
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('galleryTheme') || 'light';
  });
  const [favorites, setFavorites] = useState(() => {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
  });
  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    return JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  });
  const [trending, setTrending] = useState([]);
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isLooping: false,
    playbackRate: 1,
    isFullscreen: false,
    isSlideshow: false,
    slideshowSpeed: 3000
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [selectedForBulk, setSelectedForBulk] = useState([]);
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [liveActivities, setLiveActivities] = useState([]);
  const [userStats, setUserStats] = useState(() => {
    return JSON.parse(localStorage.getItem('userStats') || '{}');
  });
  const [playlists, setPlaylists] = useState(() => {
    return JSON.parse(localStorage.getItem('playlists') || '[]');
  });
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [reactions, setReactions] = useState(() => {
    return JSON.parse(localStorage.getItem('reactions') || '{}');
  });
  const [showReactions, setShowReactions] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const playerContainerRef = useRef(null);
  const observerRef = useRef(null);
  const lastElementRef = useRef(null);
  const slideshowIntervalRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const currentYear = new Date().getFullYear();

  // Emoji reactions
  const emojiReactions = ['❤️', '🙏', '😂', '😢', '😮', '🎉', '🔥', '👍'];

  // Format number with K/M
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Add to recently viewed
  const addToRecentlyViewed = (mediaId) => {
    let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    recent = [mediaId, ...recent.filter(id => id !== mediaId)].slice(0, 10);
    localStorage.setItem('recentlyViewed', JSON.stringify(recent));
    setRecentlyViewed(recent);
  };

  // Add to favorites
  const addToFavorites = (mediaId) => {
    let favs = [...favorites];
    if (favs.includes(mediaId)) {
      favs = favs.filter(id => id !== mediaId);
      toast.success('Removed from favorites');
      updateStats('unfavorite');
    } else {
      favs.push(mediaId);
      toast.success('Added to favorites');
      updateStats('favorite');
    }
    setFavorites(favs);
    localStorage.setItem('favorites', JSON.stringify(favs));
  };

  // Check if media is favorited
  const isFavorite = (mediaId) => favorites.includes(mediaId);

  // Add reaction
  const addReaction = (mediaId, emoji) => {
    const newReactions = { ...reactions };
    if (!newReactions[mediaId]) newReactions[mediaId] = {};
    newReactions[mediaId][emoji] = (newReactions[mediaId][emoji] || 0) + 1;
    setReactions(newReactions);
    localStorage.setItem('reactions', JSON.stringify(newReactions));
    toast.success(`Reacted with ${emoji}`);
    updateStats('react');
  };

  // Save watch progress
  const saveProgress = (mediaId, currentTime, duration) => {
    const progress = JSON.parse(localStorage.getItem('watchProgress') || '{}');
    progress[mediaId] = { time: currentTime, duration, timestamp: Date.now() };
    localStorage.setItem('watchProgress', JSON.stringify(progress));
    updateStats('watchTime', currentTime);
  };

  // Update user stats
  const updateStats = (action, value = 1) => {
    const newStats = { ...userStats };
    if (action === 'like') newStats.totalLikesGiven = (newStats.totalLikesGiven || 0) + 1;
    if (action === 'comment') newStats.totalCommentsMade = (newStats.totalCommentsMade || 0) + 1;
    if (action === 'download') newStats.totalDownloads = (newStats.totalDownloads || 0) + 1;
    if (action === 'share') newStats.totalShares = (newStats.totalShares || 0) + 1;
    if (action === 'favorite') newStats.totalFavorites = (newStats.totalFavorites || 0) + 1;
    if (action === 'watchTime') newStats.totalWatchTime = (newStats.totalWatchTime || 0) + value;
    setUserStats(newStats);
    localStorage.setItem('userStats', JSON.stringify(newStats));
  };

  // Create playlist
  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist = { id: Date.now(), name: newPlaylistName, items: [], createdAt: new Date().toISOString() };
    setPlaylists([...playlists, newPlaylist]);
    localStorage.setItem('playlists', JSON.stringify([...playlists, newPlaylist]));
    setNewPlaylistName("");
    setShowPlaylistModal(false);
    toast.success('Playlist created!');
  };

  // Add to playlist
  const addToPlaylist = (playlistId, mediaId) => {
    const updated = playlists.map(p => 
      p.id === playlistId && !p.items.includes(mediaId) 
        ? { ...p, items: [...p.items, mediaId] } 
        : p
    );
    setPlaylists(updated);
    localStorage.setItem('playlists', JSON.stringify(updated));
    toast.success('Added to playlist');
  };

  // Bulk download as ZIP
  const downloadSelectedAsZip = async () => {
    const zip = new JSZip();
    const selectedMediaList = media.filter(m => selectedForBulk.includes(m.id));
    
    for (const item of selectedMediaList) {
      try {
        const response = await fetch(item.url);
        const blob = await response.blob();
        const ext = item.url.split('.').pop() || 'jpg';
        zip.file(`${item.title}.${ext}`, blob);
      } catch (err) {
        console.error("Error downloading:", err);
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'zuca-gallery.zip');
    toast.success(`Downloaded ${selectedMediaList.length} files`);
    setSelectedForBulk([]);
    setShowBulkMode(false);
  };

  // Generate QR Code for sharing
  const generateQRCode = async (mediaId, title) => {
    const url = `${window.location.origin}/gallery/${mediaId}`;
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, url, { width: 300, margin: 2 });
    setQrCode(canvas.toDataURL());
    setShowQRModal(true);
  };

  // Print media
  const printMedia = () => {
    if (!selectedMedia) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>${selectedMedia.title}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          img { max-width: 100%; height: auto; }
          h1 { color: #1e293b; }
          .meta { color: #64748b; margin-top: 20px; }
        </style>
        </head>
        <body>
          <img src="${selectedMedia.url}" alt="${selectedMedia.title}" />
          <h1>${selectedMedia.title}</h1>
          <p>${selectedMedia.description || ''}</p>
          <div class="meta">ZUCA Gallery - ${new Date().toLocaleDateString()}</div>
        </body>
      </html>
    `);
    printWindow.print();
  };

  // Cast to TV (Chromecast)
  const castToTV = () => {
    if (!selectedMedia) return;
    if (window.cast && window.cast.framework) {
      const context = cast.framework.CastContext.getInstance();
      context.setOptions({ receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID });
      const session = context.getCurrentSession();
      if (session) {
        const mediaInfo = new chrome.cast.media.MediaInfo(selectedMedia.url);
        const request = new chrome.cast.media.LoadRequest(mediaInfo);
        session.loadMedia(request);
        toast.success('Casting to TV...');
      } else {
        toast.error('No Cast device found');
      }
    } else {
      toast.error('Chromecast not available');
    }
  };

  // Create collage from selected media
  const createCollage = async () => {
    const selectedMediaList = media.filter(m => selectedForBulk.includes(m.id));
    if (selectedMediaList.length === 0) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const images = await Promise.all(
      selectedMediaList.slice(0, 9).map(async item => {
        const img = new Image();
        img.src = item.url;
        await new Promise(resolve => { img.onload = resolve; });
        return img;
      })
    );
    
    const cols = Math.ceil(Math.sqrt(images.length));
    const size = 300;
    canvas.width = size * cols;
    canvas.height = size * Math.ceil(images.length / cols);
    
    images.forEach((img, i) => {
      const x = (i % cols) * size;
      const y = Math.floor(i / cols) * size;
      ctx.drawImage(img, x, y, size, size);
    });
    
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'zuca-collage.png';
      link.click();
      toast.success('Collage created!');
    });
  };

  // Slideshow mode
  const toggleSlideshow = () => {
    setPlayerState(prev => ({ ...prev, isSlideshow: !prev.isSlideshow }));
    if (!playerState.isSlideshow) {
      slideshowIntervalRef.current = setInterval(() => {
        if (currentIndex < media.length - 1) {
          nextMedia();
        } else if (currentIndex === media.length - 1) {
          setCurrentIndex(0);
          setSelectedMedia(media[0]);
          trackView(media[0].id);
          addToRecentlyViewed(media[0].id);
          fetchComments(media[0].id);
        } else {
          toggleSlideshow();
        }
      }, playerState.slideshowSpeed);
      toast.success('Slideshow started');
    } else {
      if (slideshowIntervalRef.current) clearInterval(slideshowIntervalRef.current);
      toast.success('Slideshow stopped');
    }
  };

  // Picture-in-Picture mode
  const togglePIP = async () => {
    if (videoRef.current) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    }
  };

  // Touch handlers for swipe on mobile
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      // Swipe left - next
      nextMedia();
    }
    if (touchStart - touchEnd < -50) {
      // Swipe right - previous
      previousMedia();
    }
  };

  // Simulate live activities
  useEffect(() => {
    const activities = [
   
    ];
    const interval = setInterval(() => {
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      setLiveActivities(prev => [randomActivity, ...prev].slice(0, 5));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  

const goBack = () => {
  navigate(-1); // Goes back to previous page
};

const goHome = () => {
  navigate('/dashboard'); // Goes to dashboard
};

  // Fetch media from backend
  const fetchMedia = async (isLoadMore = false) => {
    try {
      setLoading(true);
      const params = {
        page: isLoadMore ? pagination.page + 1 : 1,
        limit: pagination.limit,
        type: filters.type !== "all" ? filters.type : undefined,
        category: filters.category !== "all" ? filters.category : undefined,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        featured: filters.category === 'featured' ? true : undefined
      };
      
      const response = await axios.get(`${BASE_URL}/api/media/public`, { params });
      
      const newMedia = response.data.media || [];
      const newPagination = response.data.pagination || {};
      
      if (isLoadMore) {
        setMedia(prev => [...prev, ...newMedia]);
      } else {
        setMedia(newMedia);
      }
      
      setPagination({
        page: newPagination.page || 1,
        limit: newPagination.limit || 20,
        total: newPagination.total || 0,
        totalPages: newPagination.totalPages || 0,
        hasMore: newPagination.page < newPagination.totalPages
      });
      
    } catch (err) {
      console.error("Error fetching media:", err);
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  // Fetch trending media
  // Fetch trending media - using existing public media endpoint
const fetchTrending = async () => {
  try {
    // Use existing endpoint with most viewed sorting
    const response = await axios.get(`${BASE_URL}/api/media/public?sortBy=mostViewed&limit=4`);
    setTrending(response.data.media || []);
  } catch (err) {
    console.error("Error fetching trending:", err);
    setTrending([]);
  }
};

  // Fetch comments for media
  const fetchComments = async (mediaId) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/media/${mediaId}/comments`);
      setComments(response.data.comments || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setComments([]);
    }
  };

  // Track view
  const trackView = async (mediaId) => {
    if (!token) return;
    try {
      await axios.post(`${BASE_URL}/api/media/${mediaId}/view`, {}, { headers });
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  // Handle like
  const handleLike = async (mediaId) => {
    if (!token) {
      toast.error('Please login to like');
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${BASE_URL}/api/media/${mediaId}/like`, {}, { headers });
      const liked = response.data.liked;
      setMedia(prev => prev.map(item => {
        if (item.id === mediaId) {
          return {
            ...item,
            _count: {
              ...item._count,
              likes: (item._count?.likes || 0) + (liked ? 1 : -1)
            },
            userLiked: liked
          };
        }
        return item;
      }));
      if (selectedMedia?.id === mediaId) {
        setSelectedMedia(prev => ({
          ...prev,
          _count: {
            ...prev._count,
            likes: (prev._count?.likes || 0) + (liked ? 1 : -1)
          },
          userLiked: liked
        }));
      }
      updateStats('like');
      toast.success(liked ? 'Liked!' : 'Unliked');
    } catch (err) {
      console.error("Error liking media:", err);
      toast.error('Failed to like');
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!token) {
      toast.error('Please login to comment');
      navigate('/login');
      return;
    }
    if (!newComment.trim()) return;
    try {
      const response = await axios.post(`${BASE_URL}/api/media/${selectedMedia.id}/comments`, 
        { content: newComment }, 
        { headers }
      );
      setNewComment("");
      fetchComments(selectedMedia.id);
      setMedia(prev => prev.map(item => {
        if (item.id === selectedMedia.id) {
          return {
            ...item,
            _count: { ...item._count, comments: (item._count?.comments || 0) + 1 }
          };
        }
        return item;
      }));
      updateStats('comment');
      toast.success('Comment added');
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error('Failed to add comment');
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${BASE_URL}/api/media/comments/${commentId}`, { headers });
      fetchComments(selectedMedia.id);
      setMedia(prev => prev.map(item => {
        if (item.id === selectedMedia.id) {
          return {
            ...item,
            _count: { ...item._count, comments: Math.max(0, (item._count?.comments || 0) - 1) }
          };
        }
        return item;
      }));
      toast.success('Comment deleted');
    } catch (err) {
      console.error("Error deleting comment:", err);
      toast.error('Failed to delete comment');
    }
  };

  // Handle download
  const handleDownload = async (mediaId, url) => {
    if (!token) {
      toast.error('Please login to download');
      navigate('/login');
      return;
    }
    try {
      await axios.post(`${BASE_URL}/api/media/${mediaId}/download`, {}, { headers });
      const link = window.document.createElement('a');
      link.href = url;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      updateStats('download');
      toast.success('Download started');
    } catch (err) {
      console.error("Error downloading:", err);
    }
  };

  // Handle share
  const handleShare = async (platform, mediaId, title) => {
    if (!token) {
      toast.error('Please login to share');
      navigate('/login');
      return;
    }
    try {
      await axios.post(`${BASE_URL}/api/media/${mediaId}/share`, { platform }, { headers });
      updateStats('share');
    } catch (err) {
      console.error("Error tracking share:", err);
    }
    
    const url = `${window.location.origin}/gallery/${mediaId}`;
    const text = `Check out "${title}" on ZUCA Gallery! 🙏`;
    
    switch(platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'instagram':
        navigator.clipboard.writeText(url);
        toast.success('Link copied! Open Instagram to share');
        break;
      default:
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
    }
  };

  // Open media player with swipe navigation
  const openPlayer = (media, index) => {
    setSelectedMedia(media);
    setCurrentIndex(index);
    setShowPlayer(true);
    trackView(media.id);
    addToRecentlyViewed(media.id);
    fetchComments(media.id);
    setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  };

  // Close player
  const closePlayer = () => {
    setShowPlayer(false);
    setSelectedMedia(null);
    if (slideshowIntervalRef.current) clearInterval(slideshowIntervalRef.current);
    setPlayerState(prev => ({ ...prev, isPlaying: false, isSlideshow: false }));
  };

  // Navigate to previous media
  const previousMedia = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setSelectedMedia(media[newIndex]);
      trackView(media[newIndex].id);
      addToRecentlyViewed(media[newIndex].id);
      fetchComments(media[newIndex].id);
      setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    } else if (playerState.isLooping) {
      // Loop back to last
      const newIndex = media.length - 1;
      setCurrentIndex(newIndex);
      setSelectedMedia(media[newIndex]);
      trackView(media[newIndex].id);
      addToRecentlyViewed(media[newIndex].id);
      fetchComments(media[newIndex].id);
    }
  };

  // Navigate to next media
  const nextMedia = () => {
    if (currentIndex < media.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSelectedMedia(media[newIndex]);
      trackView(media[newIndex].id);
      addToRecentlyViewed(media[newIndex].id);
      fetchComments(media[newIndex].id);
      setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    } else if (playerState.isLooping) {
      // Loop back to first
      setCurrentIndex(0);
      setSelectedMedia(media[0]);
      trackView(media[0].id);
      addToRecentlyViewed(media[0].id);
      fetchComments(media[0].id);
    }
  };

  // Player controls
  const togglePlay = () => {
    if (selectedMedia?.type === 'video' && videoRef.current) {
      if (playerState.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      if (playerState.isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleTimeUpdate = () => {
    let currentTime = 0;
    let duration = 0;
    if (selectedMedia?.type === 'video' && videoRef.current) {
      currentTime = videoRef.current.currentTime;
      duration = videoRef.current.duration;
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      currentTime = audioRef.current.currentTime;
      duration = audioRef.current.duration;
    }
    setPlayerState(prev => ({ ...prev, currentTime, duration }));
    saveProgress(selectedMedia?.id, currentTime, duration);
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = newTime;
      setPlayerState(prev => ({ ...prev, currentTime: newTime }));
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.currentTime = newTime;
      setPlayerState(prev => ({ ...prev, currentTime: newTime }));
    }
  };

  const toggleMute = () => {
    const newMuted = !playerState.isMuted;
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.muted = newMuted;
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.muted = newMuted;
    }
    setPlayerState(prev => ({ ...prev, isMuted: newMuted, volume: newMuted ? 0 : prev.volume }));
    localStorage.setItem('preferredVolume', newMuted ? 0 : playerState.volume);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setPlayerState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }));
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.volume = newVolume;
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    localStorage.setItem('preferredVolume', newVolume);
  };

  const toggleLoop = () => {
    const newLoop = !playerState.isLooping;
    setPlayerState(prev => ({ ...prev, isLooping: newLoop }));
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.loop = newLoop;
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.loop = newLoop;
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentRateIndex = rates.indexOf(playerState.playbackRate);
    const nextRate = rates[(currentRateIndex + 1) % rates.length];
    setPlayerState(prev => ({ ...prev, playbackRate: nextRate }));
    if (selectedMedia?.type === 'video' && videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    } else if (selectedMedia?.type === 'audio' && audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
    localStorage.setItem('preferredPlaybackRate', nextRate);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!playerState.isFullscreen) {
      playerContainerRef.current.requestFullscreen();
      setPlayerState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setPlayerState(prev => ({ ...prev, isFullscreen: false }));
    }
  };

  // Format time for player
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get media icon
  const getMediaIcon = (type) => {
    switch(type) {
      case 'image': return <FiImage />;
      case 'video': return <FiVideo />;
      case 'audio': return <FiMusic />;
      default: return <FiImage />;
    }
  };

  // Load more on infinite scroll
  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchMedia(true);
    }
  }, [pagination.hasMore, loading]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination.hasMore && !loading) {
        loadMore();
      }
    });
    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }
    return () => observerRef.current?.disconnect();
  }, [pagination.hasMore, loading, media.length]);


  // Apply theme
  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('galleryTheme', theme);
  }, [theme]);

  // Initial fetch
  useEffect(() => {
    fetchMedia();
    fetchTrending();
  }, [filters.type, filters.category, filters.search, filters.sortBy]);

  // Keyboard shortcuts for player
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!showPlayer) return;
      switch(e.key) {
        case 'ArrowLeft': previousMedia(); break;
        case 'ArrowRight': nextMedia(); break;
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'f': toggleFullscreen(); break;
        case 'Escape': closePlayer(); break;
        case 'm': toggleMute(); break;
        case 'l': toggleLoop(); break;
        case 's': if (selectedMedia) handleShare('copy', selectedMedia.id, selectedMedia.title); break;
        case 'p': togglePIP(); break;
        case 'r': toggleSlideshow(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showPlayer, selectedMedia, currentIndex]);

  // Restore saved volume and playback rate
  useEffect(() => {
    const savedVolume = localStorage.getItem('preferredVolume');
    const savedRate = localStorage.getItem('preferredPlaybackRate');
    if (savedVolume) setPlayerState(prev => ({ ...prev, volume: parseFloat(savedVolume) }));
    if (savedRate) setPlayerState(prev => ({ ...prev, playbackRate: parseFloat(savedRate) }));
  }, []);

  // Cleanup slideshow interval on unmount
  useEffect(() => {
    return () => {
      if (slideshowIntervalRef.current) clearInterval(slideshowIntervalRef.current);
    };
  }, []);

  // Get filtered media for sections
  const favoriteMedia = media.filter(m => favorites.includes(m.id));
  const recentMedia = media.filter(m => recentlyViewed.includes(m.id)).slice(0, 4);

  return (
    <div className={`gallery-page ${theme}`}>
      <Toaster position="top-right" />
      
      <div className="gallery-content">
        {/* Live Activity Feed */}
        

       {/* Header - ONLY ONE COPY OF THIS */}
<div className="gallery-header">
  <div className="header-left">
    {/* Back buttons here - NOT inside player modal */}
    <div className="nav-buttons">
      <button className="back-btn" onClick={goBack} title="Go back">
        ← Back
      </button>
      <button className="home-btn" onClick={goHome} title="Go home">
        🏠
      </button>
    </div>
    <h1>📸 ZUCA Gallery</h1>
    <p>Share and celebrate our faith through photos, videos, and music</p>
  </div>
  <div className="header-right">
    <button className="theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? <FiMoon /> : <FiSun />}
    </button>
    <button className="bulk-toggle" onClick={() => setShowBulkMode(!showBulkMode)}>
      <FiGridIcon /> Bulk
    </button>
    {token && (
      <button className="profile-btn" onClick={() => navigate('/profile')}>
        <FiUser />
      </button>
    )}
  </div>
</div>
        {/* User Stats Summary */}
        {token && userStats.totalLikesGiven > 0 && (
          <div className="user-stats-bar">
            <span>❤️ {userStats.totalLikesGiven || 0} likes</span>
            <span>💬 {userStats.totalCommentsMade || 0} comments</span>
            <span>⬇️ {userStats.totalDownloads || 0} downloads</span>
            <span>↗️ {userStats.totalShares || 0} shares</span>
            <span>⭐ {userStats.totalFavorites || 0} favorites</span>
            <span>⏱️ {Math.floor((userStats.totalWatchTime || 0) / 60)} min watched</span>
          </div>
        )}

        {/* Search & Filters */}
        <div className="filters-section">
          <div className="search-bar">
            <FiSearch />
            <input 
              type="text" 
              placeholder="Search by title, description, or tags..." 
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && fetchMedia()}
            />
          </div>
          
          <div className="filter-tabs">
            <button className={filters.type === 'all' ? 'active' : ''} onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}>📷 All</button>
            <button className={filters.type === 'image' ? 'active' : ''} onClick={() => setFilters(prev => ({ ...prev, type: 'image' }))}>🖼️ Photos</button>
            <button className={filters.type === 'video' ? 'active' : ''} onClick={() => setFilters(prev => ({ ...prev, type: 'video' }))}>🎬 Videos</button>
            <button className={filters.type === 'audio' ? 'active' : ''} onClick={() => setFilters(prev => ({ ...prev, type: 'audio' }))}>🎵 Audio</button>
            <button className={filters.category === 'featured' ? 'active' : ''} onClick={() => setFilters(prev => ({ ...prev, category: prev.category === 'featured' ? 'all' : 'featured' }))}>⭐ Featured</button>
            <button className={filters.category === 'favorites' ? 'active' : ''} onClick={() => setFilters(prev => ({ ...prev, category: prev.category === 'favorites' ? 'all' : 'favorites' }))}>❤️ Favorites</button>
          </div>

          <div className="filter-controls">
            <div className="sort-dropdown">
              <button onClick={() => setSortMenuOpen(!sortMenuOpen)}>
                Sort: {filters.sortBy === 'latest' ? 'Latest' : filters.sortBy === 'popular' ? 'Most Liked' : 'Most Viewed'} <FiChevronDown />
              </button>
              {sortMenuOpen && (
                <div className="dropdown-menu">
                  <button onClick={() => { setFilters(prev => ({ ...prev, sortBy: 'latest' })); setSortMenuOpen(false); }}>Latest First</button>
                  <button onClick={() => { setFilters(prev => ({ ...prev, sortBy: 'popular' })); setSortMenuOpen(false); }}>Most Liked</button>
                  <button onClick={() => { setFilters(prev => ({ ...prev, sortBy: 'mostViewed' })); setSortMenuOpen(false); }}>Most Viewed</button>
                </div>
              )}
            </div>
            <div className="view-toggle">
              <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => { setViewMode('grid'); localStorage.setItem('galleryViewMode', 'grid'); }}><FiGrid /></button>
              <button className={viewMode === 'list' ? 'active' : ''} onClick={() => { setViewMode('list'); localStorage.setItem('galleryViewMode', 'list'); }}><FiList /></button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkMode && (
          <div className="bulk-bar">
            <button onClick={() => setSelectedForBulk(media.map(m => m.id))}>Select All</button>
            <button onClick={() => setSelectedForBulk([])}>Clear</button>
            <span>{selectedForBulk.length} selected</span>
            <button onClick={downloadSelectedAsZip} disabled={selectedForBulk.length === 0}><FiDownload /> Download ZIP</button>
            <button onClick={createCollage} disabled={selectedForBulk.length === 0}>📸 Create Collage</button>
            <button onClick={() => setShowBulkMode(false)}>Cancel</button>
          </div>
        )}

        {/* Stats Sections */}
        <div className="stats-sections">
          <div className="stat-section trending">
            <h3><FiTrendingUp /> Trending Now</h3>
            <div className="trending-grid">
              {trending.map(item => (
                <div key={item.id} className="trending-card" onClick={() => openPlayer(item, media.findIndex(m => m.id === item.id))}>
                  <img src={item.thumbnailUrl || item.url} alt={item.title} />
                  <div className="trending-info">
                    <h4>{item.title}</h4>
                    <span>{formatNumber(item._count?.views || 0)} views</span>
                    <span className="trend-badge">🔥 +{Math.floor(Math.random() * 50)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {favoriteMedia.length > 0 && (
            <div className="stat-section favorites">
              <h3><FiStar /> My Favorites</h3>
              <div className="favorites-grid">
                {favoriteMedia.slice(0, 4).map(item => (
                  <div key={item.id} className="favorite-card" onClick={() => openPlayer(item, media.findIndex(m => m.id === item.id))}>
                    <img src={item.thumbnailUrl || item.url} alt={item.title} />
                    <div className="favorite-info">
                      <h4>{item.title}</h4>
                      <span>❤️ {formatNumber(item._count?.likes || 0)} likes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentMedia.length > 0 && (
            <div className="stat-section recent">
              <h3><FiClock /> Recently Viewed</h3>
              <div className="recent-grid">
                {recentMedia.map(item => (
                  <div key={item.id} className="recent-card" onClick={() => openPlayer(item, media.findIndex(m => m.id === item.id))}>
                    <img src={item.thumbnailUrl || item.url} alt={item.title} />
                    <div className="recent-info">
                      <h4>{item.title}</h4>
                      <span>🕐 {formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Gallery Grid/List */}
        <div className={`gallery-container ${viewMode}`}>
          {media.length === 0 && !loading ? (
            <div className="empty-state">
              <FiImage size={64} />
              <h3>No media found</h3>
              <p>Try adjusting your search or filters</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="media-grid">
              {media.map((item, idx) => (
                <motion.div 
                  key={item.id} 
                  className={`media-card ${selectedForBulk.includes(item.id) ? 'selected' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => showBulkMode ? setSelectedForBulk(prev => 
                    prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                  ) : openPlayer(item, idx)}
                >
                  <div className="media-thumbnail">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.title} />
                    ) : item.type === 'video' ? (
                      <video src={item.url} />
                    ) : item.type === 'audio' ? (
                      <div className="audio-placeholder"><FiMusic size={32} /></div>
                    ) : (
                      <img src={item.url} alt={item.title} />
                    )}
                    {item.type === 'video' && <div className="video-badge"><FiPlay /></div>}
                    {item.type === 'audio' && <div className="audio-badge"><FiMusic /></div>}
                    {item.isFeatured && <div className="featured-badge"><FiStar /></div>}
                    {isFavorite(item.id) && <div className="favorite-badge"><FiStar /></div>}
                    {selectedForBulk.includes(item.id) && <div className="selected-check">✓</div>}
                  </div>
                  <div className="media-info">
                    <h4>{item.title}</h4>
                    <div className="media-stats">
                      <span><FiHeart /> {formatNumber(item._count?.likes || 0)}</span>
                      <span><FiMessageCircle /> {formatNumber(item._count?.comments || 0)}</span>
                      <span><FiEye /> {formatNumber(item._count?.views || 0)}</span>
                    </div>
                    <div className="media-meta">
                      <span><FiUser /> {item.uploadedBy?.fullName?.split(' ')[0] || 'Admin'}</span>
                      <span><FiClock /> {formatRelativeTime(item.createdAt)}</span>
                    </div>
                    {/* Emoji Reactions */}
                    <div className="reaction-strip">
                      {emojiReactions.slice(0, 4).map(emoji => (
                        <button key={emoji} onClick={(e) => { e.stopPropagation(); addReaction(item.id, emoji); }} className="reaction-btn">
                          {emoji} {reactions[item.id]?.[emoji] || 0}
                        </button>
                      ))}
                      <button onClick={(e) => { e.stopPropagation(); setShowReactions(!showReactions); }} className="reaction-more">
                        +{Object.keys(reactions[item.id] || {}).length}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={lastElementRef} style={{ height: '20px' }} />
            </div>
          ) : (
            <div className="media-list">
              <table className="media-table">
                <thead>
                  <tr><th>{showBulkMode && <input type="checkbox" onChange={() => setSelectedForBulk(selectedForBulk.length === media.length ? [] : media.map(m => m.id))} />}</th><th></th><th>Title</th><th>Type</th><th>Likes</th><th>Comments</th><th>Views</th><th>Uploaded</th></tr>
                </thead>
                <tbody>
                  {media.map((item, idx) => (
                    <tr key={item.id} onClick={() => showBulkMode ? setSelectedForBulk(prev => 
                      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                    ) : openPlayer(item, idx)}>
                      <td>{showBulkMode && <input type="checkbox" checked={selectedForBulk.includes(item.id)} readOnly />}</td>
                      <td>{getMediaIcon(item.type)}</td>
                      <td className="list-title">{item.title}</td>
                      <td><span className={`type-badge ${item.type}`}>{item.type}</span></td>
                      <td>❤️ {formatNumber(item._count?.likes || 0)}</td>
                      <td>💬 {formatNumber(item._count?.comments || 0)}</td>
                      <td>👁️ {formatNumber(item._count?.views || 0)}</td>
                      <td>{formatRelativeTime(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div ref={lastElementRef} style={{ height: '20px' }} />
            </div>
          )}
          
          {loading && (
            <div className="loading-skeleton">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-thumb"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line short"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <p>© {currentYear} ZUCA Portal | Gallery | Tumsifu Yesu Kristu! 🙏</p>
          <p className="shortcuts">⌨️ Keyboard shortcuts: ← → to navigate | Space play/pause | F fullscreen | Esc close | R slideshow | P picture-in-picture</p>
        </div>
      </div>

      {/* Media Player Modal with Swipe Navigation */}
      <AnimatePresence>
        {showPlayer && selectedMedia && (
          <motion.div 
            className="player-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePlayer}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <motion.div 
              className="player-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              ref={playerContainerRef}
            >
              <div className="player-header">
                <h3>{selectedMedia.title}</h3>
                <div className="player-header-actions">
                  <button onClick={() => addToFavorites(selectedMedia.id)} className={isFavorite(selectedMedia.id) ? 'favorited' : ''} title="Add to favorites">
                    <FiStar />
                  </button>
                  <button onClick={() => setShowShareMenu(!showShareMenu)} title="Share">
                    <FiShare2 />
                  </button>
                  <button onClick={printMedia} title="Print">
                    <FiPrinter />
                  </button>
                  <button onClick={toggleSlideshow} className={playerState.isSlideshow ? 'active' : ''} title="Slideshow">
                    <FiPlay />
                  </button>
                  <button onClick={closePlayer}><FiX /></button>
                </div>
              </div>


              

              {/* Share Menu */}
              {showShareMenu && (
                <div className="share-menu">
                  <button onClick={() => handleShare('whatsapp', selectedMedia.id, selectedMedia.title)}><FaWhatsapp /> WhatsApp</button>
                  <button onClick={() => handleShare('facebook', selectedMedia.id, selectedMedia.title)}><FaFacebook /> Facebook</button>
                  <button onClick={() => handleShare('twitter', selectedMedia.id, selectedMedia.title)}><FaTwitter /> Twitter</button>
                  <button onClick={() => generateQRCode(selectedMedia.id, selectedMedia.title)}><FaQrcode /> QR Code</button>
                  <button onClick={castToTV}><FiCast /> Cast to TV</button>
                </div>
              )}

              <div className="player-main">
                <button className="nav-btn prev" onClick={previousMedia} disabled={currentIndex === 0 && !playerState.isLooping}>
                  <FiChevronLeft />
                </button>

                <div className="player-wrapper">
                  {selectedMedia.type === 'image' && (
                    <img src={selectedMedia.url} alt={selectedMedia.title} className="player-image" />
                  )}
                  {selectedMedia.type === 'video' && (
                    <video
                      ref={videoRef}
                      src={selectedMedia.url}
                      className="player-video"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleTimeUpdate}
                      onEnded={() => setPlayerState(prev => ({ ...prev, isPlaying: false }))}
                      volume={playerState.volume}
                      playbackRate={playerState.playbackRate}
                    />
                  )}
                  {selectedMedia.type === 'audio' && (
                    <div className="player-audio">
                      <div className="audio-artwork">
                        <FiMusic size={80} />
                      </div>
                      <audio
                        ref={audioRef}
                        src={selectedMedia.url}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleTimeUpdate}
                        onEnded={() => setPlayerState(prev => ({ ...prev, isPlaying: false }))}
                        volume={playerState.volume}
                        playbackRate={playerState.playbackRate}
                      />
                    </div>
                  )}
                  
                  <div className="player-controls-bar">
                    <button onClick={togglePlay} className="control-btn">
                      {playerState.isPlaying ? <FiPause /> : <FiPlay />}
                    </button>
                    <div className="progress-container">
                      <span className="time-current">{formatTime(playerState.currentTime)}</span>
                      <input
                        type="range"
                        min="0"
                        max={playerState.duration || 0}
                        value={playerState.currentTime}
                        onChange={handleSeek}
                        className="progress-slider"
                      />
                      <span className="time-duration">{formatTime(playerState.duration)}</span>
                    </div>
                    <button onClick={toggleLoop} className={`control-btn ${playerState.isLooping ? 'active' : ''}`} title="Loop">
                      <FiRepeat />
                    </button>
                    <div className="volume-control">
                      <button onClick={toggleMute} className="control-btn">
                        {playerState.isMuted ? <FiVolumeX /> : <FiVolume2 />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={playerState.volume}
                        onChange={handleVolumeChange}
                        className="volume-slider"
                      />
                    </div>
                    <button onClick={changePlaybackRate} className="control-btn speed">
                      {playerState.playbackRate}x
                    </button>
                    <button onClick={togglePIP} className="control-btn" title="Picture in Picture">
                      <FiCast />
                    </button>
                    <button onClick={toggleFullscreen} className="control-btn">
                      <FiMaximize2 />
                    </button>
                  </div>
                </div>

                <button className="nav-btn next" onClick={nextMedia} disabled={currentIndex === media.length - 1 && !playerState.isLooping}>
                  <FiChevronRight />
                </button>
              </div>

              {/* Slideshow indicator */}
              {playerState.isSlideshow && (
                <div className="slideshow-indicator">
                  <span>Slideshow mode active • {playerState.slideshowSpeed / 1000}s per slide</span>
                  <button onClick={() => setPlayerState(prev => ({ ...prev, slideshowSpeed: prev.slideshowSpeed === 3000 ? 5000 : 3000 }))}>
                    Speed: {playerState.slideshowSpeed / 1000}s
                  </button>
                </div>
              )}

              <div className="player-details">
                <div className="details-stats">
                  <span><FiHeart /> {formatNumber(selectedMedia._count?.likes || 0)} Likes</span>
                  <span><FiMessageCircle /> {formatNumber(selectedMedia._count?.comments || 0)} Comments</span>
                  <span><FiEye /> {formatNumber(selectedMedia._count?.views || 0)} Views</span>
                  <span><FiDownload /> {formatNumber(selectedMedia._count?.downloads || 0)} Downloads</span>
                  <span><FiShare2 /> {formatNumber(selectedMedia._count?.shares || 0)} Shares</span>
                </div>
                <div className="details-meta">
                  <span><FiUser /> {selectedMedia.uploadedBy?.fullName || 'Admin'}</span>
                  <span><FiClock /> Uploaded {formatRelativeTime(selectedMedia.createdAt)}</span>
                  {selectedMedia.category && <span><FiFolder /> {selectedMedia.category}</span>}
                  {selectedMedia.tags?.length > 0 && <span><FiTag /> {selectedMedia.tags.join(', ')}</span>}
                </div>
                {selectedMedia.description && <p className="details-description">{selectedMedia.description}</p>}
              </div>

              <div className="player-actions">
                <button className={`action-btn like ${selectedMedia.userLiked ? 'active' : ''}`} onClick={() => handleLike(selectedMedia.id)}>
                  <FiHeart /> {selectedMedia.userLiked ? 'Liked' : 'Like'}
                </button>
                <button className="action-btn comment" onClick={() => document.querySelector('.comments-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  <FiMessageCircle /> Comment
                </button>
                <button className="action-btn share" onClick={() => setShowShareMenu(!showShareMenu)}>
                  <FiShare2 /> Share
                </button>
                <button className="action-btn download" onClick={() => handleDownload(selectedMedia.id, selectedMedia.url)}>
                  <FiDownload /> Download
                </button>
                <button className="action-btn playlist" onClick={() => setShowPlaylistModal(true)}>
                  <FiPlus /> Add to Playlist
                </button>
              </div>

              {/* Emoji Reactions Row */}
              <div className="reactions-row">
                {emojiReactions.map(emoji => (
                  <button key={emoji} onClick={() => addReaction(selectedMedia.id, emoji)} className="reaction-emoji">
                    {emoji} {reactions[selectedMedia.id]?.[emoji] || 0}
                  </button>
                ))}
              </div>

              <div className="comments-section">
                <h3>Comments ({selectedMedia._count?.comments || 0})</h3>
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <div className="no-comments">No comments yet. Be the first to comment!</div>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-avatar">
                          {comment.user?.profileImage ? (
                            <img src={comment.user.profileImage} alt="" />
                          ) : (
                            <div>{comment.user?.fullName?.charAt(0) || 'U'}</div>
                          )}
                        </div>
                        <div className="comment-content">
                          <div className="comment-header">
                            <strong>{comment.user?.fullName || 'Anonymous'}</strong>
                            <span>{formatRelativeTime(comment.createdAt)}</span>
                          </div>
                          <p>{comment.content}</p>
                        </div>
                        {(comment.userId === token?.split('.')[1] ? JSON.parse(atob(token.split('.')[1]))?.userId : null) === comment.userId && (
                          <button className="delete-comment" onClick={() => handleDeleteComment(comment.id)}>
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {token ? (
                  <div className="comment-input">
                    <input 
                      type="text" 
                      placeholder="Write a comment..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button onClick={handleAddComment}><FiSend /> Send</button>
                  </div>
                ) : (
                  <div className="login-to-comment">
                    <button onClick={() => navigate('/login')}>Login to comment</button>
                  </div>
                )}
              </div>

              <div className="thumbnail-strip">
                {media.map((item, idx) => (
                  <div 
                    key={item.id} 
                    className={`thumbnail-item ${idx === currentIndex ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setSelectedMedia(item);
                      trackView(item.id);
                      addToRecentlyViewed(item.id);
                      fetchComments(item.id);
                      setPlayerState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
                    }}
                  >
                    <img src={item.thumbnailUrl || item.url} alt={item.title} />
                    {item.type === 'video' && <div className="thumbnail-play"><FiPlay /></div>}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist Modal */}
      <AnimatePresence>
        {showPlaylistModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPlaylistModal(false)}>
            <motion.div className="modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <h3>Add to Playlist</h3>
              <div className="playlist-list">
                {playlists.map(playlist => (
                  <button key={playlist.id} onClick={() => { addToPlaylist(playlist.id, selectedMedia.id); setShowPlaylistModal(false); }}>
                    📁 {playlist.name} ({playlist.items.length} items)
                  </button>
                ))}
              </div>
              <div className="new-playlist">
                <input 
                  type="text" 
                  placeholder="New playlist name" 
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
                <button onClick={createPlaylist}>Create</button>
              </div>
              <button className="close-modal" onClick={() => setShowPlaylistModal(false)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && qrCode && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQRModal(false)}>
            <motion.div className="modal-content qr-modal" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <h3>Scan QR Code to Share</h3>
              <img src={qrCode} alt="QR Code" />
              <p>Scan with your phone camera to open this media</p>
              <button onClick={() => setShowQRModal(false)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        /* Light Theme */
        .gallery-page.light {
          --bg-primary: #f8fafc;
          --bg-secondary: #ffffff;
          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --border: #e2e8f0;
          --card-bg: #ffffff;
          --hover: #f1f5f9;
        }
        
        /* Dark Theme */
        .gallery-page.dark {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --border: #334155;
          --card-bg: #1e293b;
          --hover: #334155;
        }
        
        .gallery-page {
          min-height: 100vh;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.3s ease;
        }
        
        .gallery-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }
        
        /* Live Feed */
        .live-feed {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }
        
        .live-activity {
          background: var(--bg-secondary);
          border-radius: 40px;
          padding: 8px 16px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          animation: slideIn 0.3s ease;
          pointer-events: auto;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .activity-icon { font-size: 14px; }
        .activity-time { color: var(--text-secondary); font-size: 10px; }
        
        /* Header */
        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .gallery-header h1 { font-size: 28px; margin-bottom: 4px; }
        .gallery-header p { color: var(--text-secondary); font-size: 14px; }
        
        .theme-toggle, .profile-btn, .bulk-toggle {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        /* User Stats Bar */
        .user-stats-bar {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          padding: 10px 16px;
          background: var(--bg-secondary);
          border-radius: 40px;
          margin-bottom: 20px;
          font-size: 12px;
          border: 1px solid var(--border);
        }
        
        /* Filters */
        .filters-section {
          background: var(--bg-secondary);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 24px;
          border: 1px solid var(--border);
        }
        
        .search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-primary);
          padding: 10px 16px;
          border-radius: 40px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
        }
        
        .search-bar input {
          flex: 1;
          border: none;
          background: none;
          outline: none;
          font-size: 14px;
          color: var(--text-primary);
        }
        
        .filter-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        
        .filter-tabs button {
          padding: 6px 14px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.2s;
        }
        
        .filter-tabs button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        
        .filter-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .sort-dropdown { position: relative; }
        .sort-dropdown > button {
          padding: 6px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-primary);
        }
        
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          margin-top: 4px;
          z-index: 10;
        }
        
        .dropdown-menu button {
          display: block;
          width: 100%;
          padding: 8px 16px;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          color: var(--text-primary);
        }
        
        .dropdown-menu button:hover { background: var(--hover); }
        
        .view-toggle {
          display: flex;
          gap: 4px;
          background: var(--bg-primary);
          border-radius: 10px;
          padding: 3px;
        }
        
        .view-toggle button {
          padding: 6px 10px;
          background: transparent;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        
        .view-toggle button.active {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        
        /* Bulk Bar */
        .bulk-bar {
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          border: 1px solid var(--border);
        }
        
        .bulk-bar button {
          padding: 6px 12px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        
        /* Stats Sections */
        .stats-sections {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 32px;
        }
        
        .stat-section {
          background: var(--bg-secondary);
          border-radius: 20px;
          padding: 20px;
          border: 1px solid var(--border);
        }
        
        .stat-section h3 {
          font-size: 18px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .trending-grid, .favorites-grid, .recent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .trending-card, .favorite-card, .recent-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-primary);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .trending-card:hover, .favorite-card:hover, .recent-card:hover { transform: translateX(4px); }
        
        .trending-card img, .favorite-card img, .recent-card img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
        }
        
        .trending-info h4, .favorite-info h4, .recent-info h4 {
          font-size: 14px;
          margin-bottom: 4px;
        }
        
        .trending-info span, .favorite-info span, .recent-info span {
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .trend-badge {
          display: inline-block;
          margin-left: 8px;
          color: #ef4444;
        }
        
        /* Gallery Grid */
        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        
        .media-card {
          background: var(--card-bg);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }
        
        .media-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }
        
        .media-card.selected {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px #3b82f6;
        }
        
        .selected-check {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          z-index: 5;
        }
        
        .media-thumbnail {
          position: relative;
          height: 180px;
          background: var(--bg-primary);
          overflow: hidden;
        }
        
        .media-thumbnail img, .media-thumbnail video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .audio-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          color: var(--text-secondary);
        }
        
        .video-badge, .audio-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0,0,0,0.7);
          border-radius: 20px;
          padding: 4px 8px;
          color: white;
          font-size: 10px;
        }
        
        .featured-badge, .favorite-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #f59e0b;
          border-radius: 20px;
          padding: 2px 6px;
          font-size: 10px;
          color: white;
        }
        
        .media-info { padding: 12px; }
        .media-info h4 {
          font-size: 14px;
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .media-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
          font-size: 11px;
          color: var(--text-secondary);
        }
        
        .media-stats span { display: flex; align-items: center; gap: 4px; }
        .media-meta {
          display: flex;
          gap: 12px;
          font-size: 10px;
          color: var(--text-secondary);
        }
        
        .media-meta span { display: flex; align-items: center; gap: 4px; }
        
        /* Reaction Strip */
        .reaction-strip {
          display: flex;
          gap: 4px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        
        .reaction-btn {
          background: var(--bg-primary);
          border: none;
          border-radius: 20px;
          padding: 2px 6px;
          font-size: 11px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        
        /* List View */
        .media-list { overflow-x: auto; }
        .media-table {
          width: 100%;
          background: var(--bg-secondary);
          border-radius: 16px;
          border-collapse: collapse;
        }
        
        .media-table th, .media-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        
        .media-table tr { cursor: pointer; }
        .media-table tr:hover { background: var(--hover); }
        
        .type-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }
        .type-badge.image { background: #d1fae5; color: #10b981; }
        .type-badge.video { background: #fef3c7; color: #f59e0b; }
        .type-badge.audio { background: #fce7f3; color: #ec4899; }
        
        /* Player Modal */
        .player-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.95);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .player-modal {
          background: var(--bg-secondary);
          border-radius: 24px;
          width: 100%;
          max-width: 1200px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        
        .player-header h3 { font-size: 18px; }
        .player-header-actions { display: flex; gap: 8px; }
        .player-header-actions button {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          cursor: pointer;
          color: var(--text-primary);
        }
        
        .player-header-actions button.favorited { color: #f59e0b; }
        .player-header-actions button.active { background: #3b82f6; color: white; }
        
        /* Share Menu */
        .share-menu {
          position: absolute;
          top: 70px;
          right: 20px;
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid var(--border);
          z-index: 10;
        }
        
        .share-menu button {
          padding: 8px 16px;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          color: var(--text-primary);
        }
        
        .share-menu button:hover { background: var(--hover); }
        
        .player-main {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
        }
        
        .nav-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); }
        .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .player-wrapper {
          flex: 1;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
        }
        
        .player-image, .player-video {
          width: 100%;
          max-height: 400px;
          object-fit: contain;
        }
        
        .player-audio { padding: 60px; text-align: center; }
        .audio-artwork {
          width: 150px;
          height: 150px;
          margin: 0 auto;
          background: var(--bg-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }
        
        .player-controls-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(0,0,0,0.8);
          flex-wrap: wrap;
        }
        
        .control-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: 8px;
          padding: 6px 10px;
          color: white;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .control-btn.active { background: #3b82f6; }
        .control-btn.speed { min-width: 50px; }
        
        .progress-container {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .progress-slider {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
        }
        
        .progress-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }
        
        .volume-control {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .volume-slider {
          width: 60px;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
        }
        
        .time-current, .time-duration { font-size: 12px; color: white; }
        
        /* Slideshow Indicator */
        .slideshow-indicator {
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 8px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        
        .slideshow-indicator button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          text-decoration: underline;
        }
        
        .player-details {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        
        .details-stats {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        
        .details-stats span {
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .details-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .details-meta span { display: flex; align-items: center; gap: 6px; }
        .details-description {
          font-size: 13px;
          line-height: 1.5;
          margin-top: 8px;
        }
        
        .player-actions {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
        }
        
        .action-btn {
          padding: 8px 16px;
          border-radius: 30px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        
        .action-btn.like.active { background: #fee2e2; color: #ef4444; }
        
        /* Reactions Row */
        .reactions-row {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
        }
        
        .reaction-emoji {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 30px;
          padding: 4px 12px;
          cursor: pointer;
          font-size: 14px;
        }
        
        /* Comments Section */
        .comments-section { padding: 20px; }
        .comments-section h3 { margin-bottom: 16px; }
        
        .comments-list {
          max-height: 300px;
          overflow-y: auto;
          margin-bottom: 16px;
        }
        
        .comment-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: var(--bg-primary);
          border-radius: 12px;
          margin-bottom: 12px;
          position: relative;
        }
        
        .comment-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          overflow: hidden;
        }
        
        .comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .comment-content { flex: 1; }
        
        .comment-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 12px;
        }
        
        .comment-header strong { color: var(--text-primary); }
        .comment-header span { color: var(--text-secondary); font-size: 10px; }
        .comment-content p { font-size: 13px; color: var(--text-primary); }
        
        .delete-comment {
          position: absolute;
          right: 12px;
          top: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          opacity: 0;
        }
        
        .comment-item:hover .delete-comment { opacity: 1; }
        .no-comments { text-align: center; padding: 30px; color: var(--text-secondary); }
        
        .comment-input {
          display: flex;
          gap: 12px;
        }
        
        .comment-input input {
          flex: 1;
          padding: 10px 16px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 30px;
          font-size: 13px;
          color: var(--text-primary);
          outline: none;
        }
        
        .comment-input button {
          padding: 8px 20px;
          background: #3b82f6;
          border: none;
          border-radius: 30px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .login-to-comment { text-align: center; padding: 20px; }
        .login-to-comment button {
          padding: 8px 24px;
          background: #3b82f6;
          border: none;
          border-radius: 30px;
          color: white;
          cursor: pointer;
        }
        
        /* Thumbnail Strip */
        .thumbnail-strip {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          overflow-x: auto;
          border-top: 1px solid var(--border);
        }
        
        .thumbnail-item {
          width: 80px;
          height: 60px;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          position: relative;
          opacity: 0.6;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        
        .thumbnail-item.active {
          opacity: 1;
          border: 2px solid #3b82f6;
        }
        
        .thumbnail-item img { width: 100%; height: 100%; object-fit: cover; }
        .thumbnail-play {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.6);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        /* Loading Skeleton */
        .loading-skeleton {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        
        .skeleton-card {
          background: var(--bg-secondary);
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        
        .skeleton-thumb {
          height: 180px;
          background: linear-gradient(90deg, var(--border) 25%, var(--hover) 50%, var(--border) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-line {
          height: 16px;
          margin: 12px;
          background: linear-gradient(90deg, var(--border) 25%, var(--hover) 50%, var(--border) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        
        .skeleton-line.short { width: 60%; }
        
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: var(--bg-secondary);
          border-radius: 20px;
        }
        
        .empty-state svg { color: var(--text-secondary); margin-bottom: 16px; }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
        }
        
        .modal-content {
          background: var(--bg-secondary);
          border-radius: 20px;
          padding: 24px;
          min-width: 300px;
          text-align: center;
        }
        
        .modal-content h3 { margin-bottom: 16px; }
        .playlist-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .playlist-list button {
          padding: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
        }
        
        .new-playlist { display: flex; gap: 8px; margin-bottom: 16px; }
        .new-playlist input {
          flex: 1;
          padding: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
        }
        
        .new-playlist button {
          padding: 8px 16px;
          background: #3b82f6;
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
        }
        
        .qr-modal img { width: 200px; height: 200px; margin: 16px auto; }
        .close-modal {
          padding: 8px 24px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          margin-top: 16px;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          padding: 24px;
          margin-top: 32px;
          border-top: 1px solid var(--border);
        }
        
        .footer p { font-size: 11px; color: var(--text-secondary); margin: 4px 0; }
        .shortcuts { font-size: 10px; opacity: 0.7; }
        
        /* Responsive */
        @media (max-width: 768px) {
          .gallery-content { padding: 16px; }
          .media-grid { grid-template-columns: 1fr; }
          .trending-grid, .favorites-grid, .recent-grid { grid-template-columns: 1fr; }
          .player-main { flex-direction: column; }
          .nav-btn { display: none; }
          .thumbnail-strip { display: none; }
          .player-actions { flex-wrap: wrap; }
          .details-stats { flex-wrap: wrap; }
          .user-stats-bar { font-size: 10px; gap: 10px; }
          .live-feed { display: none; }
        }

        .nav-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.back-btn, .home-btn {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-primary);
  transition: all 0.2s;
}

.back-btn:hover, .home-btn:hover {
  background: var(--hover);
  transform: translateX(-2px);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .nav-buttons {
    margin-bottom: 12px;
  }
  
  .back-btn, .home-btn {
    padding: 4px 10px;
    font-size: 11px;
  }
}
      `}</style>
    </div>
  );
}

export default Gallery;