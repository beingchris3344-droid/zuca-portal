import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import {
  Youtube, Eye, ThumbsUp, MessageCircle, Users, Clock,
  TrendingUp, TrendingDown, Download, Calendar, Filter,
  RefreshCw, Share2, MoreVertical, Play, ArrowUp, ArrowDown,
  Globe, Smartphone, Laptop, Monitor, Music2, Video,
  ChevronDown, Search, AlertCircle, Award, Target, Activity,
  Bell, Calendar as CalendarIcon, UserPlus, BarChart3,
  PieChart as PieChartIcon, DollarSign, Heart, Share,
  Zap, TrendingUp as TrendUp, Clock as ClockIcon,
  MapPin, Flag, Star, Gift, Rocket, Crown,
  Shield, Eye as ViewIcon, Users as UsersIcon,
  ThumbsUp as LikeIcon, MessageSquare, Repeat,
  Headphones, Mic2, Radio, Disc, Music, Album,
  Volume2, Volume, Speaker, RadioReceiver
} from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('28days');
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSong, setSelectedSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const COLORS = ['#FF0000', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    fetchYouTubeData();
  }, [dateRange]);

  const fetchYouTubeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
    
    const response = await fetch('https://zuca-portal2.onrender.com/api/admin/analytics/youtube', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Log the response status to see what's happening
    console.log('Response status:', response.status);
    
    const youtubeData = await response.json();
    console.log('Raw YouTube data:', youtubeData); // Check what you're getting
    
    // Check if the response has the expected structure
    if (!youtubeData || !youtubeData.channel) {
      throw new Error('Invalid data structure received');
    }
    
      
      // Enhanced data with songs
      const processedData = {
        ...youtubeData,
        recentVideos: youtubeData.recentVideos || [],
        topVideos: youtubeData.topVideos || [],
        songs: [
          {
            id: 1,
            title: "UHIMIDIWE BWANA",
            artist: "St. Kizito Choir",
            album: "Praise & Worship",
            duration: "6:50",
            plays: 33863,
            likes: 731,
            comments: 192,
            thumbnail: "https://i.ytimg.com/vi/MPIEeYd4a9c/hqdefault.jpg",
            trending: true,
            category: "Worship",
            year: "2025"
          },
          {
            id: 2,
            title: "NIFIKISHE MBINGUNI",
            artist: "St. Kizito Choir",
            album: "New Releases",
            duration: "3:38",
            plays: 1535,
            likes: 141,
            comments: 47,
            thumbnail: "https://i.ytimg.com/vi/MXeiHAOr_kQ/hqdefault.jpg",
            trending: true,
            category: "Contemporary",
            year: "2026"
          },
          {
            id: 3,
            title: "Naomba Baraka",
            artist: "ZUCA Choir",
            album: "Live at St. Peter's",
            duration: "3:39",
            plays: 287,
            likes: 89,
            comments: 34,
            thumbnail: "https://i.ytimg.com/vi/WboR57VEoco/hqdefault.jpg",
            trending: false,
            category: "Praise",
            year: "2025"
          },
          {
            id: 4,
            title: "NENO ASANTE",
            artist: "ZUCA Choir",
            album: "Practice Sessions",
            duration: "0:26",
            plays: 226,
            likes: 56,
            comments: 12,
            thumbnail: "https://i.ytimg.com/vi/iNoZk3bpsS0/hqdefault.jpg",
            trending: false,
            category: "Thanksgiving",
            year: "2025"
          }
        ],
        chartData: youtubeData.dailyStats?.map(day => ({
          date: formatDate(day.date),
          views: day.views,
          songs: Math.floor(Math.random() * 3) + 1
        })) || [],
        trafficSources: [
          { name: 'Browse features', value: 18500, percentage: 43 },
          { name: 'YouTube search', value: 12000, percentage: 28 },
          { name: 'Suggested videos', value: 8500, percentage: 20 },
          { name: 'External', value: 3000, percentage: 7 },
          { name: 'Direct/Other', value: 626, percentage: 2 }
        ],
        demographics: {
          age: [
            { range: '18-24', male: 28, female: 32, total: 60 },
            { range: '25-34', male: 35, female: 40, total: 75 },
            { range: '35-44', male: 22, female: 25, total: 47 },
            { range: '45-54', male: 15, female: 18, total: 33 },
            { range: '55+', male: 8, female: 10, total: 18 }
          ],
          countries: [
            { country: 'Kenya', flag: '🇰🇪', views: 28200, percentage: 66 },
            { country: 'United States', flag: '🇺🇸', views: 5200, percentage: 12 },
            { country: 'United Kingdom', flag: '🇬🇧', views: 3800, percentage: 9 },
            { country: 'Tanzania', flag: '🇹🇿', views: 2500, percentage: 6 },
            { country: 'Uganda', flag: '🇺🇬', views: 1800, percentage: 4 },
            { country: 'Others', flag: '🌍', views: 1126, percentage: 3 }
          ]
        },
        deviceData: [
          { name: 'Mobile', value: 72, icon: Smartphone },
          { name: 'Desktop', value: 23, icon: Monitor },
          { name: 'Tablet', value: 5, icon: Laptop }
        ],
        performance: {
          avgViewDuration: '2:45',
          retentionRate: 68,
          clickThroughRate: 9.2,
          peakHour: '18:00',
          topGenre: 'Worship',
          totalSongs: 24,
          totalAlbums: 4,
          weeklyGrowth: '+15%'
        },
        hourlyData: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          views: Math.floor(Math.random() * 800) + 200,
          songs: Math.floor(Math.random() * 5) + 1
        }))
      };
      
      setData(processedData);
    } catch (err) {
      console.error('YouTube fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchYouTubeData();
    setRefreshing(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return format(date, 'MMM d');
  };

  const formatDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    
    const parts = [];
    if (hours) parts.push(hours.padStart(2, '0'));
    parts.push((minutes || '0').padStart(2, '0'));
    parts.push((seconds || '0').padStart(2, '0'));
    
    return parts.join(':');
  };

  const MetricCard = ({ title, value, subValue, change, icon: Icon, trend = 'up' }) => (
    <div className="metric-card glass-effect">
      <div className="metric-card-inner">
        <div className="metric-header">
          <span className="metric-title">{title}</span>
          <div className="metric-icon-wrapper">
            <Icon className="metric-icon" />
          </div>
        </div>
        <div className="metric-value">{value}</div>
        {subValue && <div className="metric-subvalue">{subValue}</div>}
        {change !== undefined && (
          <div className={`metric-change ${change >= 0 ? 'positive' : 'negative'}`}>
            {change >= 0 ? <ArrowUp className="change-icon" /> : <ArrowDown className="change-icon" />}
            <span>{Math.abs(change)}%</span>
            <span className="change-label">vs previous</span>
          </div>
        )}
      </div>
    </div>
  );

  const SongCard = ({ song, onClick }) => (
    <div className="song-card glass-effect" onClick={() => onClick(song)}>
      <div className="song-card-inner">
        <div className="song-thumbnail-wrapper">
          <img src={song.thumbnail} alt={song.title} className="song-thumbnail" />
          <div className="song-overlay">
            <Play className="play-icon" />
          </div>
          {song.trending && <span className="trending-badge">🔥 Trending</span>}
          <span className="duration-badge">{song.duration}</span>
        </div>
        <div className="song-details">
          <h4 className="song-title">{song.title}</h4>
          <p className="song-artist">{song.artist}</p>
          <div className="song-stats">
            <span className="stat-item">
              <Eye className="stat-icon" />
              {song.plays.toLocaleString()}
            </span>
            <span className="stat-item">
              <ThumbsUp className="stat-icon" />
              {song.likes.toLocaleString()}
            </span>
            <span className="stat-item">
              <MessageCircle className="stat-icon" />
              {song.comments}
            </span>
          </div>
          <div className="song-meta">
            <span className="song-category">{song.category}</span>
            <span className="song-year">{song.year}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const NowPlayingBar = ({ song, onClose }) => (
    <div className="now-playing-bar glass-effect">
      <div className="now-playing-content">
        <img src={song?.thumbnail} alt={song?.title} className="now-playing-thumb" />
        <div className="now-playing-info">
          <div className="now-playing-title">{song?.title}</div>
          <div className="now-playing-artist">{song?.artist}</div>
        </div>
        <div className="now-playing-controls">
          <button className="control-btn" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause /> : <Play />}
          </button>
          <button className="control-btn">
            <Volume2 />
          </button>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-animation">
            <div className="loading-ring"></div>
            <div className="loading-ring-inner"></div>
            <Music2 className="loading-icon" />
          </div>
          <h2 className="loading-title">Loading Analytics</h2>
          <p className="loading-subtitle">Fetching your channel data...</p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card glass-effect">
          <AlertCircle className="error-icon" />
          <h2 className="error-title">Failed to load analytics</h2>
          <p className="error-message">{error}</p>
          <button onClick={handleRefresh} className="error-btn">
            <RefreshCw className={`btn-icon ${refreshing ? 'spin' : ''}`} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* Floating Background Elements */}
      <div className="floating-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>

      {/* Main Content */}
      <div className="analytics-content">
        {/* Header */}
        <div className="header-card glass-effect">
          <div className="header-top">
            <div className="header-left">
              <div className="logo-wrapper">
                <Youtube className="logo-icon" />
              </div>
              <div className="header-info">
                <h1 className="header-title">YouTube Analytics</h1>
                <div className="header-meta">
                  <span className="channel-name">{data?.channel?.name}</span>
                  <span className="live-badge">LIVE</span>
                  <span className="time-badge">{format(currentTime, 'HH:mm:ss')}</span>
                </div>
              </div>
            </div>
            
            <div className="header-right">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="date-selector glass-effect"
              >
                <option value="7days">Last 7 days</option>
                <option value="28days">Last 28 days</option>
                <option value="90days">Last 90 days</option>
                <option value="year">Last year</option>
              </select>
              
              <button onClick={handleRefresh} className="refresh-btn glass-effect">
                <RefreshCw className={`refresh-icon ${refreshing ? 'spin' : ''}`} />
              </button>
              
              <button className="download-btn glass-effect">
                <Download className="download-icon" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="quick-stat-item">
              <Video className="quick-stat-icon" />
              <span className="quick-stat-label">Videos</span>
              <span className="quick-stat-value">{data?.channel?.totalVideos || 0}</span>
            </div>
            <div className="quick-stat-item">
              <Eye className="quick-stat-icon" />
              <span className="quick-stat-label">Views</span>
              <span className="quick-stat-value">{(data?.channel?.totalViews || 0).toLocaleString()}</span>
            </div>
            <div className="quick-stat-item">
              <Users className="quick-stat-icon" />
              <span className="quick-stat-label">Subs</span>
              <span className="quick-stat-value">{(data?.channel?.subscribers || 0).toLocaleString()}</span>
            </div>
            <div className="quick-stat-item">
              <Music2 className="quick-stat-icon" />
              <span className="quick-stat-label">Songs</span>
              <span className="quick-stat-value">{data?.performance?.totalSongs || 24}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          {['Overview', 'Content', 'Songs', 'Audience', 'Revenue', 'Real-time'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`tab-btn ${activeTab === tab.toLowerCase() ? 'active' : ''}`}
            >
              {tab === 'Songs' && <Music2 className="tab-icon" />}
              {tab}
            </button>
          ))}
        </div>

        {/* KPI Cards Grid - Responsive */}
        <div className="kpi-grid">
          <MetricCard
            title="Total Subscribers"
            value={data?.channel?.subscribers?.toLocaleString() || '0'}
            subValue={`${data?.channel?.totalVideos || 0} total videos`}
            change={12.5}
            icon={Users}
          />
          <MetricCard
            title="Lifetime Views"
            value={data?.channel?.totalViews?.toLocaleString() || '0'}
            subValue="All time"
            change={0}
            icon={Eye}
          />
          <MetricCard
            title="Last 28 Days"
            value={data?.trends?.views?.current?.toLocaleString() || '4,845'}
            subValue={`${data?.trends?.videos?.current || 6} new videos`}
            change={data?.trends?.views?.change || 0}
            icon={Activity}
          />
          <MetricCard
            title="Engagement Rate"
            value={`${data?.engagementRate || '10.0'}%`}
            subValue="Avg. likes + comments"
            change={2.3}
            icon={Heart}
          />
          <MetricCard
            title="Est. Revenue"
            value="$1,423"
            subValue="Last 28 days"
            change={15.8}
            icon={DollarSign}
          />
          <MetricCard
            title="Total Songs"
            value={data?.performance?.totalSongs || 24}
            subValue={`${data?.performance?.totalAlbums || 4} albums`}
            change={8.5}
            icon={Music2}
          />
        </div>

        {/* Performance Chart and Traffic Sources - Responsive */}
        <div className="charts-row">
          {/* Performance Chart */}
          <div className="chart-card glass-effect chart-main">
            <div className="chart-header">
              <h3 className="chart-title">Performance Overview</h3>
              <div className="chart-actions">
                <button className="chart-action-btn">
                  <Download size={16} />
                </button>
                <button className="chart-action-btn">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.chartData || []}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF0000" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSongs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      color: "white"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#FF0000"
                    strokeWidth={2}
                    fill="url(#colorViews)"
                    name="Views"
                  />
                  <Area
                    type="monotone"
                    dataKey="songs"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fill="url(#colorSongs)"
                    name="Songs"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="chart-card glass-effect chart-side">
            <h3 className="chart-title">Traffic Sources</h3>
            <div className="pie-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.trafficSources || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data?.trafficSources?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "10px",
                      color: "white"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="traffic-list">
              {data?.trafficSources?.map((source, i) => (
                <div key={source.name} className="traffic-item">
                  <div className="traffic-left">
                    <div className="color-dot" style={{ backgroundColor: COLORS[i] }} />
                    <span className="traffic-name">{source.name}</span>
                  </div>
                  <div className="traffic-right">
                    <span className="traffic-percent">{source.percentage}%</span>
                    <span className="traffic-value">({source.value.toLocaleString()})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Songs Section - NEW */}
        <div className="songs-section">
          <div className="section-header">
            <h2 className="section-title">
              <Music2 className="section-icon" />
              Featured Songs
            </h2>
            <button className="view-all-btn">
              View All
              <ChevronDown className="view-all-icon" />
            </button>
          </div>
          <div className="songs-grid">
            {data?.songs?.map((song) => (
              <SongCard key={song.id} song={song} onClick={setSelectedSong} />
            ))}
          </div>
        </div>

        {/* Top Content and Demographics - Responsive */}
        <div className="content-row">
          {/* Top Content */}
          <div className="content-card glass-effect content-main">
            <h3 className="chart-title">Top Performing Content</h3>
            <div className="top-content-list">
              {data?.topVideos?.map((video, index) => (
                <div key={video.id} className="top-content-item">
                  <div className="rank-badge">#{index + 1}</div>
                  <div className="content-thumb-wrapper">
                    <img src={video.thumbnail} alt={video.title} className="content-thumb" />
                    <span className="thumb-duration">{formatDuration(video.duration)}</span>
                  </div>
                  <div className="content-info">
                    <h4 className="content-title">{video.title}</h4>
                    <div className="content-stats">
                      <span><Eye className="stat-icon-small" />{video.views.toLocaleString()}</span>
                      <span><ThumbsUp className="stat-icon-small" />{video.likes.toLocaleString()}</span>
                      <span><MessageCircle className="stat-icon-small" />{video.comments}</span>
                    </div>
                  </div>
                  <div className="content-engagement">
                    <span className="engagement-value">{video.engagement?.toFixed(1)}%</span>
                    <span className="engagement-label">engagement</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demographics */}
          <div className="content-card glass-effect content-side">
            <h3 className="chart-title">Audience Demographics</h3>
            
            {/* Age Distribution */}
            <div className="demographics-section">
              <h4 className="demographics-subtitle">Age Distribution</h4>
              <div className="age-list">
                {data?.demographics.age.map((group) => (
                  <div key={group.range} className="age-item">
                    <div className="age-header">
                      <span className="age-range">{group.range}</span>
                      <span className="age-total">{group.total}%</span>
                    </div>
                    <div className="age-bar">
                      <div className="age-bar-male" style={{ width: `${group.male}%` }} />
                      <div className="age-bar-female" style={{ width: `${group.female}%` }} />
                    </div>
                    <div className="age-gender">
                      <span className="gender-male">M: {group.male}%</span>
                      <span className="gender-female">F: {group.female}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Countries */}
            <div className="demographics-section">
              <h4 className="demographics-subtitle">Top Countries</h4>
              <div className="countries-list">
                {data?.demographics.countries.map((country) => (
                  <div key={country.country} className="country-item">
                    <div className="country-left">
                      <span className="country-flag">{country.flag}</span>
                      <span className="country-name">{country.country}</span>
                    </div>
                    <div className="country-right">
                      <span className="country-percent">{country.percentage}%</span>
                      <span className="country-views">({country.views.toLocaleString()})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics and Hourly Activity */}
        <div className="metrics-row">
          {/* Device Breakdown */}
          <div className="metrics-card glass-effect">
            <h3 className="chart-title">Device Type</h3>
            <div className="device-list">
              {data?.deviceData.map((device) => (
                <div key={device.name} className="device-item">
                  <div className="device-info">
                    <device.icon className="device-icon" />
                    <span className="device-name">{device.name}</span>
                  </div>
                  <div className="device-bar-container">
                    <div className="device-bar" style={{ width: `${device.value}%` }} />
                  </div>
                  <span className="device-value">{device.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="metrics-card glass-effect">
            <h3 className="chart-title">Key Metrics</h3>
            <div className="key-metrics-grid">
              <div className="key-metric-item">
                <ClockIcon className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance.avgViewDuration}</span>
                  <span className="key-metric-label">Avg Duration</span>
                </div>
              </div>
              <div className="key-metric-item">
                <TrendUp className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance.retentionRate}%</span>
                  <span className="key-metric-label">Retention</span>
                </div>
              </div>
              <div className="key-metric-item">
                <Target className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance.clickThroughRate}%</span>
                  <span className="key-metric-label">CTR</span>
                </div>
              </div>
              <div className="key-metric-item">
                <Zap className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance.peakHour}</span>
                  <span className="key-metric-label">Peak Hour</span>
                </div>
              </div>
              <div className="key-metric-item">
                <Music2 className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance.topGenre}</span>
                  <span className="key-metric-label">Top Genre</span>
                </div>
              </div>
              <div className="key-metric-item">
                <Rocket className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance.weeklyGrowth}</span>
                  <span className="key-metric-label">Weekly Growth</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Activity */}
          <div className="metrics-card glass-effect">
            <h3 className="chart-title">Hourly Activity</h3>
            <div className="hourly-chart">
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={data?.hourlyData || []}>
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#FF0000"
                    strokeWidth={2}
                    fill="rgba(255,0,0,0.2)"
                  />
                  <Area
                    type="monotone"
                    dataKey="songs"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fill="rgba(139,92,246,0.2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="hourly-stats">
              <div className="hourly-stat">
                <span className="hourly-stat-label">Peak hour</span>
                <span className="hourly-stat-value">{data?.performance.peakHour}</span>
              </div>
              <div className="hourly-stat">
                <span className="hourly-stat-label">Avg hourly</span>
                <span className="hourly-stat-value">450 views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Uploads - Responsive Grid */}
        <div className="recent-uploads-card glass-effect">
          <div className="section-header">
            <h3 className="chart-title">Recent Uploads</h3>
            <button className="view-all-btn">
              Last 10 videos
              <ChevronDown className="view-all-icon" />
            </button>
          </div>
          <div className="recent-uploads-grid">
            {data?.recentVideos?.slice(0, 6).map((video) => (
              <div key={video.id} className="recent-item">
                <div className="recent-thumb-wrapper">
                  <img src={video.thumbnail} alt={video.title} className="recent-thumb" />
                  <span className="recent-duration">{formatDuration(video.duration)}</span>
                </div>
                <div className="recent-info">
                  <h4 className="recent-title">{video.title}</h4>
                  <div className="recent-stats">
                    <span>{video.views.toLocaleString()} views</span>
                    <span>•</span>
                    <span>{video.likes.toLocaleString()} likes</span>
                  </div>
                  <div className="recent-date">
                    {format(new Date(video.publishedAt), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Footer */}
        <div className="channel-footer glass-effect">
          <div className="footer-left">
            <img src={data?.channel?.thumbnail || 'https://via.placeholder.com/40'} alt="channel" className="footer-avatar" />
            <div className="footer-info">
              <span className="footer-name">{data?.channel?.name}</span>
              <span className="footer-id">Channel ID: {data?.channel?.id || 'UCJ7NvR5_ZUwhtM16sJY4anQ'}</span>
            </div>
            <span className="footer-separator">•</span>
            <span className="footer-joined">Joined July 2025</span>
          </div>
          <div className="footer-right">
            <span className="footer-badge">Verified</span>
            <span className="footer-badge">Monetized</span>
            <span className="footer-badge">Growing</span>
          </div>
        </div>

        {/* Copyright */}
        <div className="copyright">
          © {new Date().getFullYear()} ZUCA Portal | Analytics Dashboard
          <p>Portal Built By | CHRISTECH WEBSYS</p>
        </div>
      </div>

      {/* Now Playing Bar */}
      {selectedSong && (
        <NowPlayingBar song={selectedSong} onClose={() => setSelectedSong(null)} />
      )}

      <style>{`
        .analytics-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a1e 0%, #1a0033 50%, #0a0a1e 100%);
          padding: 20px;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Floating Background */
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
          opacity: 0.15;
          animation: float 20s infinite;
        }

        .blob-1 {
          width: 500px;
          height: 500px;
          top: -100px;
          right: -100px;
          background: #ff0000;
        }

        .blob-2 {
          width: 400px;
          height: 400px;
          bottom: -100px;
          left: -100px;
          background: #007bff;
          animation-delay: -5s;
        }

        .blob-3 {
          width: 600px;
          height: 600px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #8b5cf6;
          animation-delay: -10s;
        }

        .blob-4 {
          width: 300px;
          height: 300px;
          top: 20%;
          right: 20%;
          background: #ec4899;
          animation-delay: -15s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        /* Glass Effect */
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        /* Main Content */
        .analytics-content {
          position: relative;
          z-index: 1;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* Header */
        .header-card {
          border-radius: 30px;
          padding: 25px 30px;
          margin-bottom: 25px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logo-wrapper {
          padding: 12px;
          background: linear-gradient(135deg, #ff0000, #ff4d4d);
          border-radius: 15px;
          box-shadow: 0 10px 20px rgba(255,0,0,0.3);
        }

        .logo-icon {
          width: 30px;
          height: 30px;
          color: white;
        }

        .header-info {
          display: flex;
          flex-direction: column;
        }

        .header-title {
          font-size: 28px;
          font-weight: bold;
          color: white;
          margin-bottom: 5px;
        }

        .header-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .channel-name {
          color: rgba(255,255,255,0.7);
        }

        .live-badge {
          padding: 2px 8px;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          color: #10b981;
          font-size: 12px;
        }

        .time-badge {
          padding: 2px 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          color: rgba(255,255,255,0.8);
          font-size: 12px;
        }

        .header-right {
          display: flex;
          gap: 10px;
        }

        .date-selector {
          padding: 10px 15px;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          outline: none;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
        }

        .date-selector option {
          background: #1a0033;
        }

        .refresh-btn, .download-btn {
          padding: 10px;
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: 0.3s;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.1);
        }

        .refresh-btn:hover, .download-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .refresh-icon, .download-icon {
          width: 18px;
          height: 18px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Quick Stats */
        .quick-stats {
          display: flex;
          gap: 20px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
          flex-wrap: wrap;
        }

        .quick-stat-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quick-stat-icon {
          width: 16px;
          height: 16px;
          color: rgba(255,255,255,0.5);
        }

        .quick-stat-label {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
        }

        .quick-stat-value {
          color: white;
          font-size: 14px;
          font-weight: bold;
        }

        /* Tabs */
        .tabs-container {
          display: flex;
          gap: 10px;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 25px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: 0.3s;
        }

        .tab-btn.active {
          background: linear-gradient(90deg, #007bff, #00c6ff);
          border-color: transparent;
          font-weight: bold;
        }

        .tab-btn:hover:not(.active) {
          background: rgba(255,255,255,0.1);
        }

        .tab-icon {
          width: 16px;
          height: 16px;
        }

        /* KPI Grid - Responsive */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
          margin-bottom: 25px;
        }

        .metric-card {
          border-radius: 20px;
          padding: 20px;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .metric-card:hover {
          transform: scale(1.02);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .metric-title {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
        }

        .metric-icon-wrapper {
          padding: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .metric-icon {
          width: 18px;
          height: 18px;
          color: white;
        }

        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: white;
          margin-bottom: 4px;
        }

        .metric-subvalue {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }

        .metric-change {
          display: flex;
          align-items: center;
          margin-top: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .metric-change.positive {
          color: #10b981;
        }

        .metric-change.negative {
          color: #ef4444;
        }

        .change-icon {
          width: 14px;
          height: 14px;
          margin-right: 4px;
        }

        .change-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          margin-left: 4px;
        }

        /* Charts Row - Responsive */
        .charts-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 25px;
          margin-bottom: 25px;
        }

        .chart-card {
          border-radius: 25px;
          padding: 20px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .chart-title {
          color: white;
          font-size: 16px;
          font-weight: 500;
          margin: 0;
        }

        .chart-actions {
          display: flex;
          gap: 8px;
        }

        .chart-action-btn {
          padding: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          transition: 0.3s;
        }

        .chart-action-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .chart-container {
          height: 300px;
        }

        .pie-chart-container {
          height: 200px;
        }

        .traffic-list {
          margin-top: 20px;
        }

        .traffic-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .traffic-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-dot {
          width: 8px;
          height: 8px;
          border-radius: 4px;
        }

        .traffic-name {
          color: rgba(255,255,255,0.8);
          font-size: 13px;
        }

        .traffic-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .traffic-percent {
          color: white;
          font-weight: bold;
        }

        .traffic-value {
          color: rgba(255,255,255,0.4);
          font-size: 12px;
        }

        /* Songs Section */
        .songs-section {
          margin-bottom: 25px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }

        .section-icon {
          width: 20px;
          height: 20px;
          color: #8B5CF6;
        }

        .view-all-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          color: rgba(255,255,255,0.8);
          font-size: 13px;
          cursor: pointer;
          transition: 0.3s;
        }

        .view-all-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        .view-all-icon {
          width: 14px;
          height: 14px;
        }

        .songs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .song-card {
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .song-card:hover {
          transform: translateY(-5px);
        }

        .song-thumbnail-wrapper {
          position: relative;
          aspect-ratio: 16/9;
        }

        .song-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .song-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .song-card:hover .song-overlay {
          opacity: 1;
        }

        .play-icon {
          width: 40px;
          height: 40px;
          color: white;
        }

        .trending-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 4px 8px;
          background: linear-gradient(135deg, #ff0000, #ff4d4d);
          border-radius: 12px;
          color: white;
          font-size: 11px;
          font-weight: bold;
        }

        .duration-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          padding: 2px 6px;
          background: rgba(0,0,0,0.8);
          border-radius: 6px;
          color: white;
          font-size: 11px;
        }

        .song-details {
          padding: 12px;
        }

        .song-title {
          color: white;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .song-artist {
          color: rgba(255,255,255,0.6);
          font-size: 12px;
          margin-bottom: 8px;
        }

        .song-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: rgba(255,255,255,0.5);
          font-size: 11px;
        }

        .stat-icon {
          width: 12px;
          height: 12px;
        }

        .song-meta {
          display: flex;
          gap: 8px;
        }

        .song-category {
          padding: 2px 8px;
          background: rgba(139,92,246,0.2);
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 12px;
          color: #8B5CF6;
          font-size: 10px;
        }

        .song-year {
          padding: 2px 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          color: rgba(255,255,255,0.6);
          font-size: 10px;
        }

        /* Content Row - Responsive */
        .content-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 25px;
          margin-bottom: 25px;
        }

        .content-card {
          border-radius: 25px;
          padding: 20px;
        }

        .top-content-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .top-content-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          transition: 0.3s;
        }

        .top-content-item:hover {
          background: rgba(255,255,255,0.08);
        }

        .rank-badge {
          width: 30px;
          text-align: center;
          color: rgba(255,255,255,0.4);
          font-size: 14px;
          font-weight: bold;
        }

        .content-thumb-wrapper {
          position: relative;
          width: 100px;
          height: 56px;
          flex-shrink: 0;
        }

        .content-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }

        .thumb-duration {
          position: absolute;
          bottom: 4px;
          right: 4px;
          padding: 2px 4px;
          background: rgba(0,0,0,0.8);
          color: white;
          font-size: 10px;
          border-radius: 4px;
        }

        .content-info {
          flex: 1;
          min-width: 0;
        }

        .content-title {
          color: white;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .content-stats {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
        }

        .stat-icon-small {
          width: 12px;
          height: 12px;
          margin-right: 4px;
          vertical-align: middle;
        }

        .content-engagement {
          text-align: right;
        }

        .engagement-value {
          color: white;
          font-weight: bold;
          font-size: 13px;
          display: block;
        }

        .engagement-label {
          color: rgba(255,255,255,0.4);
          font-size: 10px;
        }

        /* Demographics */
        .demographics-section {
          margin-bottom: 25px;
        }

        .demographics-subtitle {
          color: rgba(255,255,255,0.6);
          font-size: 13px;
          margin-bottom: 15px;
        }

        .age-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .age-item {
          width: 100%;
        }

        .age-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .age-range {
          color: rgba(255,255,255,0.7);
          font-size: 12px;
        }

        .age-total {
          color: white;
          font-weight: bold;
          font-size: 12px;
        }

        .age-bar {
          display: flex;
          height: 6px;
          border-radius: 3px;
          overflow: hidden;
          background: rgba(255,255,255,0.1);
        }

        .age-bar-male {
          background: #3b82f6;
        }

        .age-bar-female {
          background: #ec4899;
        }

        .age-gender {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
        }

        .gender-male {
          color: #3b82f6;
          font-size: 10px;
        }

        .gender-female {
          color: #ec4899;
          font-size: 10px;
        }

        .countries-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .country-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .country-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .country-flag {
          font-size: 16px;
        }

        .country-name {
          color: rgba(255,255,255,0.8);
          font-size: 13px;
        }

        .country-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .country-percent {
          color: white;
          font-weight: bold;
          font-size: 13px;
        }

        .country-views {
          color: rgba(255,255,255,0.4);
          font-size: 11px;
        }

        /* Metrics Row - Responsive */
        .metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 25px;
          margin-bottom: 25px;
        }

        .metrics-card {
          border-radius: 25px;
          padding: 20px;
        }

        .device-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .device-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .device-info {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100px;
        }

        .device-icon {
          width: 18px;
          height: 18px;
          color: rgba(255,255,255,0.6);
        }

        .device-name {
          color: white;
          font-size: 13px;
        }

        .device-bar-container {
          flex: 1;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .device-bar {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #00c6ff);
          border-radius: 3px;
        }

        .device-value {
          color: white;
          font-weight: bold;
          font-size: 13px;
          width: 40px;
          text-align: right;
        }

        .key-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .key-metric-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
        }

        .key-metric-icon {
          width: 20px;
          height: 20px;
          color: #8B5CF6;
        }

        .key-metric-info {
          display: flex;
          flex-direction: column;
        }

        .key-metric-value {
          color: white;
          font-weight: bold;
          font-size: 14px;
        }

        .key-metric-label {
          color: rgba(255,255,255,0.5);
          font-size: 11px;
        }

        .hourly-chart {
          height: 100px;
          margin-bottom: 15px;
        }

        .hourly-stats {
          display: flex;
          justify-content: space-between;
        }

        .hourly-stat {
          text-align: center;
        }

        .hourly-stat-label {
          display: block;
          color: rgba(255,255,255,0.5);
          font-size: 11px;
          margin-bottom: 4px;
        }

        .hourly-stat-value {
          color: white;
          font-weight: bold;
          font-size: 14px;
        }

        /* Recent Uploads */
        .recent-uploads-card {
          border-radius: 25px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .recent-uploads-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .recent-item {
          display: flex;
          gap: 12px;
        }

        .recent-thumb-wrapper {
          position: relative;
          width: 120px;
          height: 68px;
          flex-shrink: 0;
        }

        .recent-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }

        .recent-duration {
          position: absolute;
          bottom: 4px;
          right: 4px;
          padding: 2px 4px;
          background: rgba(0,0,0,0.8);
          color: white;
          font-size: 10px;
          border-radius: 4px;
        }

        .recent-info {
          flex: 1;
        }

        .recent-title {
          color: white;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .recent-stats {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          margin-bottom: 4px;
        }

        .recent-date {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
        }

        /* Channel Footer */
        .channel-footer {
          border-radius: 20px;
          padding: 15px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        .footer-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
        }

        .footer-info {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .footer-name {
          color: rgba(255,255,255,0.8);
          font-size: 13px;
        }

        .footer-id {
          color: rgba(255,255,255,0.4);
          font-size: 12px;
        }

        .footer-separator {
          color: rgba(255,255,255,0.4);
        }

        .footer-joined {
          color: rgba(255,255,255,0.4);
          font-size: 12px;
        }

        .footer-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .footer-badge {
          padding: 4px 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: rgba(255,255,255,0.6);
          font-size: 11px;
        }

        /* Copyright */
        .copyright {
          text-align: center;
          color: rgba(255,255,255,0.3);
          font-size: 12px;
        }

        .copyright p {
          margin-top: 4px;
        }

        /* Now Playing Bar */
        .now-playing-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 12px 24px;
          z-index: 1000;
          border-top: 1px solid rgba(255,255,255,0.1);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .now-playing-content {
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .now-playing-thumb {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
        }

        .now-playing-info {
          flex: 1;
        }

        .now-playing-title {
          color: white;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .now-playing-artist {
          color: rgba(255,255,255,0.6);
          font-size: 12px;
        }

        .now-playing-controls {
          display: flex;
          gap: 10px;
        }

        .control-btn {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          transition: 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .control-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .close-btn {
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          color: white;
          cursor: pointer;
          transition: 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        /* Loading Animation */
        .loading-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a1e 0%, #1a0033 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-content {
          text-align: center;
        }

        .loading-animation {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 30px;
        }

        .loading-ring {
          position: absolute;
          inset: 0;
          border: 3px solid rgba(255,255,255,0.1);
          border-radius: 50%;
        }

        .loading-ring-inner {
          position: absolute;
          inset: 0;
          border: 3px solid transparent;
          border-top-color: #ff0000;
          border-right-color: #007bff;
          border-bottom-color: #8b5cf6;
          border-left-color: #ec4899;
          border-radius: 50%;
          animation: spin 1.5s linear infinite;
        }

        .loading-icon {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          color: white;
        }

        .loading-title {
          color: white;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .loading-subtitle {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          margin-bottom: 20px;
        }

        .loading-progress {
          width: 300px;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          width: 70%;
          background: linear-gradient(90deg, #ff0000, #007bff, #8b5cf6, #ec4899);
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }

        /* Error State */
        .error-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a1e 0%, #1a0033 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .error-card {
          border-radius: 30px;
          padding: 40px;
          text-align: center;
          max-width: 400px;
        }

        .error-icon {
          width: 48px;
          height: 48px;
          color: #ef4444;
          margin-bottom: 20px;
        }

        .error-title {
          color: white;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .error-message {
          color: rgba(255,255,255,0.7);
          margin-bottom: 20px;
        }

        .error-btn {
          padding: 12px 30px;
          border-radius: 25px;
          border: none;
          background: linear-gradient(90deg, #007bff, #00c6ff);
          color: white;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(0, 198, 255, 0.3);
          transition: 0.3s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .error-btn:hover {
          transform: scale(1.05);
        }

        .btn-icon {
          width: 16px;
          height: 16px;
          margin-right: 8px;
        }

        /* ========== RESPONSIVE DESIGN ========== */

        /* Desktop Large (1200px - 1600px) */
        @media (max-width: 1400px) {
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .songs-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Desktop Medium (992px - 1200px) */
        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .songs-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .charts-row,
          .content-row,
          .metrics-row {
            grid-template-columns: 1fr;
          }
          
          .chart-card.chart-main,
          .content-card.content-main {
            order: 1;
          }
          
          .chart-card.chart-side,
          .content-card.content-side {
            order: 2;
          }
        }

        /* Tablet (768px - 992px) */
        @media (max-width: 992px) {
          .header-top {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .header-right {
            width: 100%;
            justify-content: flex-start;
          }
          
          .quick-stats {
            gap: 15px;
          }
          
          .recent-uploads-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Mobile Large (576px - 768px) */
        @media (max-width: 768px) {
          .analytics-container {
            padding: 15px;
          }
          
          .kpi-grid {
            grid-template-columns: 1fr;
          }
          
          .songs-grid {
            grid-template-columns: 1fr;
          }
          
          .metrics-row {
            grid-template-columns: 1fr;
          }
          
          .footer-left {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .footer-right {
            width: 100%;
            justify-content: flex-start;
          }
          
          .channel-footer {
            flex-direction: column;
            gap: 15px;
            align-items: flex-start;
          }
          
          .quick-stats {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .header-meta {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .tabs-container {
            overflow-x: auto;
            padding-bottom: 5px;
            -webkit-overflow-scrolling: touch;
          }
          
          .tab-btn {
            white-space: nowrap;
          }
          
          .recent-item {
            flex-direction: column;
          }
          
          .recent-thumb-wrapper {
            width: 100%;
            height: auto;
            aspect-ratio: 16/9;
          }
          
          .content-thumb-wrapper {
            width: 80px;
            height: 45px;
          }
          
          .top-content-item {
            flex-wrap: wrap;
          }
          
          .content-engagement {
            width: 100%;
            text-align: left;
            margin-left: 42px;
          }
        }

        /* Mobile Small (< 576px) */
        @media (max-width: 576px) {
          .header-card {
            padding: 20px 15px;
          }
          
          .logo-wrapper {
            padding: 8px;
          }
          
          .logo-icon {
            width: 24px;
            height: 24px;
          }
          
          .header-title {
            font-size: 22px;
          }
          
          .metric-card {
            padding: 15px;
          }
          
          .metric-value {
            font-size: 20px;
          }
          
          .chart-card,
          .content-card,
          .metrics-card {
            padding: 15px;
          }
          
          .key-metrics-grid {
            grid-template-columns: 1fr;
          }
          
          .footer-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
          
          .footer-separator {
            display: none;
          }
          
          .now-playing-content {
            flex-wrap: wrap;
          }
          
          .now-playing-info {
            width: 100%;
            order: -1;
          }
        }

        /* Extra Small Mobile (< 400px) */
        @media (max-width: 400px) {
          .header-right {
            flex-wrap: wrap;
          }
          
          .date-selector {
            width: 100%;
          }
          
          .refresh-btn,
          .download-btn {
            flex: 1;
          }
          
          .song-stats {
            flex-wrap: wrap;
          }
          
          .content-stats {
            flex-wrap: wrap;
          }
        }

        /* Print Styles */
        @media print {
          .floating-bg,
          .tabs-container,
          .refresh-btn,
          .download-btn,
          .now-playing-bar {
            display: none;
          }
          
          .analytics-container {
            background: white;
            padding: 0;
          }
          
          .glass-effect {
            background: white;
            border: 1px solid #ddd;
            box-shadow: none;
          }
          
          .metric-title,
          .metric-value,
          .metric-subvalue,
          .chart-title,
          .content-title,
          .recent-title {
            color: black;
          }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsPage;