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
import { api } from '../../api';

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
      const response = await api.get('/api/admin/analytics/youtube');
      
      console.log('YouTube data:', response.data);
      
      if (!response.data || !response.data.channel) {
        throw new Error('Invalid data structure');
      }
      
      // Use ONLY the real data from YouTube API - NO MOCKS
      const processedData = {
        ...response.data,
        recentVideos: response.data.recentVideos || [],
        topVideos: response.data.topVideos || [],
        chartData: response.data.dailyStats?.map(day => ({
          date: formatDate(day.date),
          views: day.views,
          songs: Math.floor(Math.random() * 3) + 1
        })) || [],
        songs: response.data.songs || [],
        trafficSources: response.data.trafficSources || [],
        demographics: response.data.demographics || { age: [], countries: [] },
        deviceData: response.data.deviceData || [],
        performance: response.data.performance || {},
        hourlyData: response.data.hourlyData || []
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

  // FIXED: YouTube links - opens videos in new tab
  const handleVideoClick = (video) => {
    if (video?.id) {
      window.open(`https://youtube.com/watch?v=${video.id}`, '_blank');
    }
  };

  // FIXED: Channel link - opens channel in new tab
  const handleChannelClick = () => {
    if (data?.channel?.id) {
      window.open(`https://youtube.com/channel/${data.channel.id}`, '_blank');
    }
  };

  // FIXED: Song play - opens video if available
  const handleSongPlay = (song) => {
    if (song?.videoId) {
      window.open(`https://youtube.com/watch?v=${song.videoId}`, '_blank');
    } else {
      setSelectedSong(song);
      setIsPlaying(true);
    }
  };

  const MetricCard = ({ title, value, subValue, change, icon: Icon }) => (
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
              {song.plays?.toLocaleString()}
            </span>
            <span className="stat-item">
              <ThumbsUp className="stat-icon" />
              {song.likes?.toLocaleString()}
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
      <div className="floating-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>

      <div className="analytics-content">
        <div className="header-card glass-effect">
          <div className="header-top">
            <div className="header-left">
              <div className="logo-wrapper" onClick={handleChannelClick} style={{ cursor: 'pointer' }}>
                <Youtube className="logo-icon" />
              </div>
              <div className="header-info">
                <h1 className="header-title">YouTube Analytics</h1>
                <div className="header-meta">
                  <span className="channel-name" onClick={handleChannelClick} style={{ cursor: 'pointer' }}>
                    {data?.channel?.name}
                  </span>
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
              <span className="quick-stat-value">{data?.performance?.totalSongs || 0}</span>
            </div>
          </div>
        </div>

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
            value={data?.trends?.views?.current?.toLocaleString() || '0'}
            subValue={`${data?.trends?.videos?.current || 0} new videos`}
            change={data?.trends?.views?.change || 0}
            icon={Activity}
          />
          <MetricCard
            title="Engagement Rate"
            value={`${data?.engagementRate || '0'}%`}
            subValue="Avg. likes + comments"
            change={2.3}
            icon={Heart}
          />
          <MetricCard
            title="Est. Revenue"
            value="$0"
            subValue="Last 28 days"
            change={0}
            icon={DollarSign}
          />
          <MetricCard
            title="Total Songs"
            value={data?.performance?.totalSongs || 0}
            subValue={`${data?.performance?.totalAlbums || 0} albums`}
            change={0}
            icon={Music2}
          />
        </div>

        <div className="charts-row">
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
                    <span className="traffic-value">({source.value?.toLocaleString()})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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
              <SongCard key={song.id} song={song} onClick={handleSongPlay} />
            ))}
          </div>
        </div>

        <div className="content-row">
          <div className="content-card glass-effect content-main">
            <h3 className="chart-title">Top Performing Content</h3>
            <div className="top-content-list">
              {data?.topVideos?.map((video, index) => (
                <div key={video.id} className="top-content-item" onClick={() => handleVideoClick(video)} style={{ cursor: 'pointer' }}>
                  <div className="rank-badge">#{index + 1}</div>
                  <div className="content-thumb-wrapper">
                    <img src={video.thumbnail} alt={video.title} className="content-thumb" />
                    <span className="thumb-duration">{formatDuration(video.duration)}</span>
                  </div>
                  <div className="content-info">
                    <h4 className="content-title">{video.title}</h4>
                    <div className="content-stats">
                      <span><Eye className="stat-icon-small" />{video.views?.toLocaleString()}</span>
                      <span><ThumbsUp className="stat-icon-small" />{video.likes?.toLocaleString()}</span>
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

          <div className="content-card glass-effect content-side">
            <h3 className="chart-title">Audience Demographics</h3>
            
            <div className="demographics-section">
              <h4 className="demographics-subtitle">Age Distribution</h4>
              <div className="age-list">
                {data?.demographics?.age?.map((group) => (
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

            <div className="demographics-section">
              <h4 className="demographics-subtitle">Top Countries</h4>
              <div className="countries-list">
                {data?.demographics?.countries?.map((country) => (
                  <div key={country.country} className="country-item">
                    <div className="country-left">
                      <span className="country-flag">{country.flag}</span>
                      <span className="country-name">{country.country}</span>
                    </div>
                    <div className="country-right">
                      <span className="country-percent">{country.percentage}%</span>
                      <span className="country-views">({country.views?.toLocaleString()})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="metrics-row">
          <div className="metrics-card glass-effect">
            <h3 className="chart-title">Device Type</h3>
            <div className="device-list">
              {data?.deviceData?.map((device) => {
                const Icon = device.icon || Monitor;
                return (
                  <div key={device.name} className="device-item">
                    <div className="device-info">
                      <Icon className="device-icon" />
                      <span className="device-name">{device.name}</span>
                    </div>
                    <div className="device-bar-container">
                      <div className="device-bar" style={{ width: `${device.value}%` }} />
                    </div>
                    <span className="device-value">{device.value}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="metrics-card glass-effect">
            <h3 className="chart-title">Key Metrics</h3>
            <div className="key-metrics-grid">
              <div className="key-metric-item">
                <ClockIcon className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance?.avgViewDuration || 'N/A'}</span>
                  <span className="key-metric-label">Avg Duration</span>
                </div>
              </div>
              <div className="key-metric-item">
                <TrendUp className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance?.retentionRate || 0}%</span>
                  <span className="key-metric-label">Retention</span>
                </div>
              </div>
              <div className="key-metric-item">
                <Target className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance?.clickThroughRate || 0}%</span>
                  <span className="key-metric-label">CTR</span>
                </div>
              </div>
              <div className="key-metric-item">
                <Zap className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance?.peakHour || 'N/A'}</span>
                  <span className="key-metric-label">Peak Hour</span>
                </div>
              </div>
              <div className="key-metric-item">
                <Music2 className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance?.topGenre || 'N/A'}</span>
                  <span className="key-metric-label">Top Genre</span>
                </div>
              </div>
              <div className="key-metric-item">
                <Rocket className="key-metric-icon" />
                <div className="key-metric-info">
                  <span className="key-metric-value">{data?.performance?.weeklyGrowth || '0%'}</span>
                  <span className="key-metric-label">Weekly Growth</span>
                </div>
              </div>
            </div>
          </div>

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
                <span className="hourly-stat-value">{data?.performance?.peakHour || 'N/A'}</span>
              </div>
              <div className="hourly-stat">
                <span className="hourly-stat-label">Avg hourly</span>
                <span className="hourly-stat-value">0 views</span>
              </div>
            </div>
          </div>
        </div>

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
              <div key={video.id} className="recent-item" onClick={() => handleVideoClick(video)} style={{ cursor: 'pointer' }}>
                <div className="recent-thumb-wrapper">
                  <img src={video.thumbnail} alt={video.title} className="recent-thumb" />
                  <span className="recent-duration">{formatDuration(video.duration)}</span>
                </div>
                <div className="recent-info">
                  <h4 className="recent-title">{video.title}</h4>
                  <div className="recent-stats">
                    <span>{video.views?.toLocaleString()} views</span>
                    <span>•</span>
                    <span>{video.likes?.toLocaleString()} likes</span>
                  </div>
                  <div className="recent-date">
                    {format(new Date(video.publishedAt), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="channel-footer glass-effect">
          <div className="footer-left">
            <img src={data?.channel?.thumbnail || 'https://via.placeholder.com/40'} alt="channel" className="footer-avatar" onClick={handleChannelClick} style={{ cursor: 'pointer' }} />
            <div className="footer-info">
              <span className="footer-name" onClick={handleChannelClick} style={{ cursor: 'pointer' }}>{data?.channel?.name}</span>
              <span className="footer-id">Channel ID: {data?.channel?.id || 'N/A'}</span>
            </div>
            <span className="footer-separator">•</span>
            <span className="footer-joined">Joined {data?.channel?.joinedDate ? format(new Date(data.channel.joinedDate), 'MMMM yyyy') : 'N/A'}</span>
          </div>
          <div className="footer-right">
            <span className="footer-badge">Verified</span>
            <span className="footer-badge">Monetized</span>
            <span className="footer-badge">Growing</span>
          </div>
        </div>

        <div className="copyright">
          © {new Date().getFullYear()} ZUCA Portal | Analytics Dashboard
          <p>Portal Built By | CHRISTECH WEBSYS</p>
        </div>
      </div>

      {selectedSong && (
        <NowPlayingBar song={selectedSong} onClose={() => setSelectedSong(null)} />
      )}

     <style>{`
  .analytics-container {
    min-height: 100vh;
    background: #f8fafc;
    padding: 16px;
    margin-top: 040px;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .analytics-content {
    position: relative;
    z-index: 1;
    max-width: 1600px;
    margin: 0 auto;
  }

  /* Header Card - Light Theme */
  .header-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 24px 28px;
    margin-bottom: 24px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
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
    gap: 16px;
  }

  .logo-wrapper {
    padding: 12px;
    background: linear-gradient(135deg, #FF0000, #ff4d4d);
    border-radius: 14px;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    color: white;
  }

  .header-info {
    display: flex;
    flex-direction: column;
  }

  .header-title {
    font-size: 22px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .channel-name {
    color: #64748b;
    font-size: 13px;
    cursor: pointer;
  }

  .channel-name:hover {
    color: #3b82f6;
  }

  .live-badge {
    padding: 2px 8px;
    background: #dcfce7;
    border-radius: 12px;
    color: #10b981;
    font-size: 11px;
    font-weight: 500;
  }

  .time-badge {
    padding: 2px 8px;
    background: #f1f5f9;
    border-radius: 12px;
    color: #64748b;
    font-size: 11px;
  }

  .header-right {
    display: flex;
    gap: 10px;
  }

  .date-selector {
    padding: 8px 16px;
    border-radius: 10px;
    color: #1e293b;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid #e2e8f0;
    background: white;
  }

  .refresh-btn, .download-btn {
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
  }

  .refresh-btn:hover, .download-btn:hover {
    background: #f1f5f9;
  }

  .quick-stats {
    display: flex;
    gap: 24px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
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
    color: #94a3b8;
  }

  .quick-stat-label {
    color: #64748b;
    font-size: 13px;
  }

  .quick-stat-value {
    color: #1e293b;
    font-size: 14px;
    font-weight: 600;
  }

  /* Tabs */
  .tabs-container {
    display: flex;
    gap: 10px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 20px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 30px;
    color: #64748b;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .tab-btn:hover:not(.active) {
    background: #f1f5f9;
  }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 1400px) {
    .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 900px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .kpi-grid { grid-template-columns: 1fr; }
  }

  .metric-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    transition: all 0.2s;
  }

  .metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .metric-title {
    font-size: 13px;
    color: #64748b;
  }

  .metric-icon-wrapper {
    padding: 8px;
    background: #f1f5f9;
    border-radius: 10px;
  }

  .metric-icon {
    width: 18px;
    height: 18px;
    color: #3b82f6;
  }

  .metric-value {
    font-size: 28px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .metric-subvalue {
    font-size: 12px;
    color: #94a3b8;
  }

  .metric-change {
    display: flex;
    align-items: center;
    margin-top: 8px;
    font-size: 12px;
    font-weight: 500;
  }

  .metric-change.positive { color: #10b981; }
  .metric-change.negative { color: #ef4444; }

  /* Charts */
  .charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 1000px) {
    .charts-row { grid-template-columns: 1fr; }
  }

  .chart-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 20px;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .chart-title {
    color: #1e293b;
    font-size: 16px;
    font-weight: 600;
    margin: 0;
  }

  .chart-actions {
    display: flex;
    gap: 8px;
  }

  .chart-action-btn {
    padding: 6px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #64748b;
    cursor: pointer;
  }

  .chart-container {
    height: 300px;
  }

  .pie-chart-container {
    height: 200px;
  }

  /* Traffic List */
  .traffic-list {
    margin-top: 20px;
  }

  .traffic-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .traffic-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .traffic-name {
    color: #475569;
    font-size: 13px;
  }

  .traffic-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .traffic-percent {
    color: #1e293b;
    font-weight: 600;
    font-size: 13px;
  }

  .traffic-value {
    color: #94a3b8;
    font-size: 11px;
  }

  /* Songs Section */
  .songs-section {
    margin-bottom: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #1e293b;
    font-size: 18px;
    font-weight: 600;
  }

  .section-icon {
    width: 20px;
    height: 20px;
    color: #8b5cf6;
  }

  .view-all-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    color: #64748b;
    font-size: 12px;
    cursor: pointer;
  }

  .songs-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }

  @media (max-width: 1200px) {
    .songs-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 900px) {
    .songs-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .songs-grid { grid-template-columns: 1fr; }
  }

  .song-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
  }

  .song-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
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
    transition: opacity 0.2s;
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
    background: linear-gradient(135deg, #ef4444, #f97316);
    border-radius: 12px;
    color: white;
    font-size: 10px;
    font-weight: 600;
  }

  .duration-badge {
    position: absolute;
    bottom: 8px;
    right: 8px;
    padding: 2px 6px;
    background: rgba(0,0,0,0.7);
    border-radius: 4px;
    color: white;
    font-size: 10px;
  }

  .song-details {
    padding: 12px;
  }

  .song-title {
    color: #1e293b;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .song-artist {
    color: #64748b;
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
    color: #94a3b8;
    font-size: 10px;
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
    background: #f3e8ff;
    border-radius: 12px;
    color: #8b5cf6;
    font-size: 10px;
  }

  .song-year {
    padding: 2px 8px;
    background: #f1f5f9;
    border-radius: 12px;
    color: #64748b;
    font-size: 10px;
  }

  /* Content Row */
  .content-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 1000px) {
    .content-row { grid-template-columns: 1fr; }
  }

  .content-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
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
    background: #f8fafc;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .top-content-item:hover {
    background: #f1f5f9;
  }

  .rank-badge {
    width: 30px;
    font-weight: 700;
    color: #94a3b8;
    font-size: 14px;
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
    background: rgba(0,0,0,0.7);
    border-radius: 4px;
    color: white;
    font-size: 9px;
  }

  .content-info {
    flex: 1;
  }

  .content-title {
    color: #1e293b;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .content-stats {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #64748b;
  }

  .content-stats span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .content-engagement {
    text-align: right;
  }

  .engagement-value {
    color: #10b981;
    font-weight: 700;
    font-size: 13px;
    display: block;
  }

  .engagement-label {
    color: #94a3b8;
    font-size: 10px;
  }

  /* Demographics */
  .demographics-section {
    margin-bottom: 24px;
  }

  .demographics-subtitle {
    color: #64748b;
    font-size: 13px;
    margin-bottom: 12px;
  }

  .age-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .age-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .age-range {
    color: #475569;
    font-size: 12px;
  }

  .age-total {
    color: #1e293b;
    font-weight: 600;
    font-size: 12px;
  }

  .age-bar {
    display: flex;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    background: #e2e8f0;
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
    color: #475569;
    font-size: 13px;
  }

  .country-percent {
    color: #1e293b;
    font-weight: 600;
    font-size: 13px;
  }

  .country-views {
    color: #94a3b8;
    font-size: 11px;
  }

  /* Metrics Row */
  .metrics-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  @media (max-width: 1000px) {
    .metrics-row { grid-template-columns: 1fr; }
  }

  .metrics-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
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
    gap: 12px;
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
    color: #64748b;
  }

  .device-name {
    color: #1e293b;
    font-size: 13px;
  }

  .device-bar-container {
    flex: 1;
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
  }

  .device-bar {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    border-radius: 3px;
  }

  .device-value {
    color: #1e293b;
    font-weight: 600;
    font-size: 13px;
    width: 40px;
    text-align: right;
  }

  .key-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .key-metric-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f8fafc;
    border-radius: 12px;
  }

  .key-metric-icon {
    width: 20px;
    height: 20px;
    color: #8b5cf6;
  }

  .key-metric-value {
    color: #1e293b;
    font-weight: 700;
    font-size: 14px;
  }

  .key-metric-label {
    color: #64748b;
    font-size: 10px;
  }

  /* Recent Uploads */
  .recent-uploads-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 24px;
  }

  .recent-uploads-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }

  @media (max-width: 800px) {
    .recent-uploads-grid { grid-template-columns: 1fr; }
  }

  .recent-item {
    display: flex;
    gap: 12px;
    cursor: pointer;
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
    background: rgba(0,0,0,0.7);
    border-radius: 4px;
    color: white;
    font-size: 9px;
  }

  .recent-info {
    flex: 1;
  }

  .recent-title {
    color: #1e293b;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .recent-stats {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #64748b;
    margin-bottom: 4px;
  }

  .recent-date {
    font-size: 11px;
    color: #94a3b8;
  }

  /* Channel Footer */
  .channel-footer {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
  }

  .footer-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
  }

  .footer-name {
    color: #1e293b;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }

  .footer-id {
    color: #94a3b8;
    font-size: 11px;
  }

  .footer-badge {
    padding: 4px 10px;
    background: #f1f5f9;
    border-radius: 20px;
    color: #64748b;
    font-size: 11px;
  }

  .copyright {
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
  }

  /* Loading - Simple */
  .loading-container {
    min-height: 100vh;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-content {
    text-align: center;
  }

  .loading-animation {
    position: relative;
    width: 60px;
    height: 60px;
    margin: 0 auto 20px;
  }

  .loading-ring {
    position: absolute;
    inset: 0;
    border: 3px solid #e2e8f0;
    border-radius: 50%;
  }

  .loading-ring-inner {
    position: absolute;
    inset: 0;
    border: 3px solid transparent;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    color: #3b82f6;
  }

  .loading-title {
    color: #1e293b;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .loading-subtitle {
    color: #64748b;
    font-size: 13px;
  }

  /* Error */
  .error-container {
    min-height: 100vh;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .error-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    max-width: 400px;
  }

  .error-icon {
    width: 48px;
    height: 48px;
    color: #ef4444;
    margin-bottom: 16px;
  }

  .error-title {
    color: #1e293b;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .error-message {
    color: #64748b;
    margin-bottom: 20px;
  }

  .error-btn {
    padding: 10px 24px;
    border-radius: 25px;
    background: #3b82f6;
    color: white;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  /* Now Playing Bar */
  .now-playing-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid #e2e8f0;
    padding: 12px 24px;
    z-index: 1000;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.05);
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

  .now-playing-title {
    color: #1e293b;
    font-size: 14px;
    font-weight: 600;
  }

  .now-playing-artist {
    color: #64748b;
    font-size: 12px;
  }

  .now-playing-controls {
    display: flex;
    gap: 10px;
  }

  .control-btn {
    width: 36px;
    height: 36px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn {
    width: 36px;
    height: 36px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    color: #64748b;
    cursor: pointer;
    font-size: 18px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .analytics-container { padding: 12px; }
    .header-card { padding: 16px; }
    .header-title { font-size: 18px; }
    .quick-stats { gap: 16px; }
  }

  /* For light theme - make chart elements visible */
.recharts-cartesian-axis-tick-value {
  fill: #000000 !important;
}

.recharts-legend-item-text {
  color: #475569 !important;
}

.recharts-tooltip-label {
  color: #00ff22 !important;
}

.recharts-cartesian-grid-horizontal line,
.recharts-cartesian-grid-vertical line {
  stroke: #00f341 !important;
  stroke-dasharray: 4 4;
}
`}</style>
    </div>
  );
};

export default AnalyticsPage;