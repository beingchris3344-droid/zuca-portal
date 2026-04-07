// frontend/src/pages/admin/OCRScannerPage.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import axios from "axios";
import Tesseract from "tesseract.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  FiCamera, FiUpload, FiCopy, FiSave, 
  FiX, FiLoader, FiImage, FiRefreshCw,
  FiArrowLeft, FiCheck, FiAlertCircle, FiCrop,
  FiAlignLeft, FiBold, FiList, FiTrash2,
  FiCornerUpLeft, FiCornerUpRight, FiZap, FiCpu,
  FiRotateCw, FiSearch, FiGlobe, FiExternalLink,
  FiMessageSquare, FiSend, FiMusic, FiMoreVertical,
  FiTrash, FiEdit3, FiStar, FiShare2, FiYoutube,
  FiHelpCircle, FiBook, FiMic, FiHeadphones, FiDownload
} from "react-icons/fi";
import { MdOutlineAutoAwesome } from "react-icons/md";
import BASE_URL from "../../api";

// API Keys
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

let genAI = null;
let model = null;

// ==================== HELPER FUNCTIONS ====================

const resizeImage = (file, maxWidth = 1200) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const rotateImage = (imageUrl, degrees) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      const rad = (degrees * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const newWidth = img.width * cos + img.height * sin;
      const newHeight = img.width * sin + img.height * cos;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      canvas.toBlob((blob) => {
        const rotatedUrl = URL.createObjectURL(blob);
        resolve({ blob, url: rotatedUrl });
      }, "image/jpeg", 0.9);
    };
    img.src = imageUrl;
  });
};

const preprocessImage = (imageBlob) => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
        const bw = brightness > 100 ? 255 : 0;
        data[i] = bw;
        data[i+1] = bw;
        data[i+2] = bw;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, "image/jpeg", 0.9);
    };
    img.src = url;
  });
};

// ==================== YOUTUBE FUNCTIONS ====================

const searchYouTube = async (query) => {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
      params: {
        part: 'snippet',
        q: query,
        maxResults: 10,
        type: 'video',
        key: YOUTUBE_API_KEY
      }
    });
    return response.data.items;
  } catch (err) {
    console.log("YouTube search failed:", err.message);
    return null;
  }
};

const getVideoDetails = async (videoId) => {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });
    return response.data.items?.[0] || null;
  } catch (err) {
    console.log("Get video details failed:", err.message);
    return null;
  }
};

const extractLyricsFromDescription = async (description, videoTitle) => {
  if (!model) return null;
  try {
    const prompt = `Extract lyrics from this YouTube video description. The video is titled: "${videoTitle}"

Description text:
${description.substring(0, 3000)}

Rules:
1. Extract ONLY the lyrics, not other info
2. If there are timestamps, ignore them
3. Format lyrics properly with verse breaks
4. If no lyrics found, say "No lyrics found in description"

Return ONLY the lyrics, nothing else.`;

    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (err) {
    console.error("Lyrics extraction failed:", err);
    return null;
  }
};

const searchLyricsByTitle = async (songTitle, artist = "") => {
  if (!model) return null;
  try {
    const searchPrompt = `Provide the complete lyrics for "${songTitle}"${artist ? ` by ${artist}` : ""}.

Format the lyrics properly with verse breaks and line breaks.

If you don't know this song, say "Lyrics not found".`;

    const result = await model.generateContent(searchPrompt);
    return await result.response.text();
  } catch (err) {
    console.error("Lyrics search failed:", err);
    return null;
  }
};

export default function OCRScannerPage() {
  const navigate = useNavigate();
  
  // State
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [step, setStep] = useState("upload");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("eng");
  const [tesseractReady, setTesseractReady] = useState(false);
  const [tesseractLoading, setTesseractLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [activeTab, setActiveTab] = useState("scan");
  const [cameraActive, setCameraActive] = useState(false);
  
  // Camera refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Crop refs
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState([]);
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [extractingYoutubeLyrics, setExtractingYoutubeLyrics] = useState(false);
  const [geminiReady, setGeminiReady] = useState(false);
  
  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Initialize Gemini
  useEffect(() => {
    initGemini();
    loadTesseract();
    return () => {
      stopCameraTracks();
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Welcome message
  useEffect(() => {
    if (chatMessages.length === 0 && geminiReady) {
      setChatMessages([{
        id: Date.now(),
        role: "assistant",
        content: `👋 **Hello! I'm ZUCA AI Assistant**

I can help you with:

📸 **Scan lyrics from images** - Upload a photo of hymn lyrics
🎬 **Extract from YouTube** - Paste a YouTube URL
🔍 **Search for lyrics** - "Find lyrics for Amazing Grace"
💬 **Chat normally** - Ask me anything!

**Try:**
• Paste a YouTube URL
• "Find lyrics for How Great Thou Art"
• "Good morning!"`,
        timestamp: new Date()
      }]);
    }
  }, [geminiReady]);

  const initGemini = () => {
    if (!API_KEY || API_KEY === "your_api_key_here" || API_KEY === "") {
      console.warn("No Gemini API key found");
      setGeminiReady(false);
      return;
    }
    
    try {
      genAI = new GoogleGenerativeAI(API_KEY);
      model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      setGeminiReady(true);
      console.log("✅ Gemini AI ready");
    } catch (err) {
      console.error("Failed to init Gemini:", err);
      setGeminiReady(false);
    }
  };

  const loadTesseract = async () => {
    setTesseractLoading(true);
    try {
      await Tesseract.createWorker();
      setTesseractReady(true);
      showNotification("OCR engine ready!", "success");
    } catch (err) {
      console.error("Failed to load Tesseract:", err);
      showNotification("Failed to load OCR engine", "error");
    } finally {
      setTesseractLoading(false);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 3000);
  };

  const saveToHistory = (newText) => {
    if (history[historyIndex] === newText) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newText);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleTextChange = (newText) => {
    setEditedText(newText);
    saveToHistory(newText);
  };

  const stopCameraTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // ==================== CAMERA FUNCTIONS (FIXED) ====================
  
 const startCamera = async () => {
  try {
    stopCameraTracks();
    
    console.log("Requesting camera...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    
    console.log("Camera stream obtained");
    streamRef.current = stream;
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        console.log("Video dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
        videoRef.current.play();
      };
      
      // Force visible
      videoRef.current.style.display = "block";
      videoRef.current.style.width = "100%";
      videoRef.current.style.minHeight = "400px";
    }
    
    setCameraActive(true);
    setStep("camera");
    showNotification("Camera ready!", "info");
  } catch (err) {
    console.error("Camera error:", err);
    showNotification(`Camera error: ${err.message}`, "error");
  }
};

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && cameraActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      setImagePreview(imageData);
      
      // Convert to file
      fetch(imageData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "captured-photo.jpg", { type: "image/jpeg" });
          setImage(file);
        });
      
      // Stop camera stream
      stopCameraTracks();
      
      setStep("crop");
      showNotification("Photo captured! Now crop to select lyrics area.", "success");
    }
  };

  const stopCamera = () => {
    stopCameraTracks();
    setStep("upload");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setStep("crop");
        showNotification("Image uploaded! Now crop to select lyrics area.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = async () => {
    if (!imagePreview) return;
    const newAngle = (rotationAngle + 90) % 360;
    setRotationAngle(newAngle);
    
    try {
      const rotated = await rotateImage(imagePreview, 90);
      setImagePreview(rotated.url);
      if (rotated.blob) {
        const rotatedFile = new File([rotated.blob], "rotated-image.jpg", { type: "image/jpeg" });
        setImage(rotatedFile);
      }
      showNotification(`Rotated ${newAngle}°`, "success");
    } catch (err) {
      console.error("Rotation failed:", err);
    }
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: "%", width: 90, height: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(crop);
  };

  const getCroppedImg = async () => {
    if (!completedCrop || !imgRef.current) return null;
    
    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext("2d");
    
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg", 0.9);
    });
  };

  const applyCrop = async () => {
    if (!completedCrop) {
      setStep("process");
      return;
    }
    
    showNotification("Applying crop...", "info");
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], "cropped-image.jpg", { type: "image/jpeg" });
        setImage(croppedFile);
        const url = URL.createObjectURL(croppedBlob);
        setImagePreview(url);
        setStep("process");
        showNotification("Crop applied! Ready to extract lyrics.", "success");
      }
    } catch (err) {
      setStep("process");
      showNotification("Crop failed, continuing with original image.", "warning");
    }
  };

  const skipCrop = () => {
    setStep("process");
    showNotification("Skipping crop. Processing original image.", "info");
  };

  // ==================== OCR PROCESSING ====================
  
  const processOCR = async () => {
    if (!image) {
      showNotification("No image to process", "error");
      return;
    }
    
    if (!tesseractReady) {
      showNotification("OCR engine still loading. Please wait...", "warning");
      return;
    }
    
    setProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus("Preparing image...");
    showNotification("Starting OCR process...", "info");
    
    try {
      setProcessingStatus("Enhancing image...");
      const enhancedImage = await preprocessImage(image);
      
      setProcessingStatus("Resizing image...");
      const resizedImage = await resizeImage(enhancedImage, 1200);
      
      setProcessingStatus("Recognizing text...");
      
      const worker = await Tesseract.createWorker(detectedLanguage);
      await worker.loadLanguage(detectedLanguage);
      await worker.initialize(detectedLanguage);
      
      const result = await worker.recognize(resizedImage, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProcessingProgress(Math.floor(m.progress * 100));
            setProcessingStatus(`Recognizing: ${Math.floor(m.progress * 100)}%`);
          }
        },
      });
      
      await worker.terminate();
      
      let text = result.data.text;
      setExtractedText(text);
      
      let formattedText = text;
      formattedText = formattedText.replace(/[ \t]+/g, " ");
      formattedText = formattedText.split("\n").map(line => {
        if (line.trim()) {
          return line.charAt(0).toUpperCase() + line.slice(1);
        }
        return line;
      }).join("\n");
      
      setEditedText(formattedText);
      setHistory([formattedText]);
      setHistoryIndex(0);
      setConfidence(Math.floor(result.data.confidence * 100));
      setStep("edit");
      showNotification(`✅ Text extracted! Confidence: ${Math.floor(result.data.confidence * 100)}%`, "success");
      
    } catch (err) {
      console.error("OCR Error:", err);
      showNotification("Failed to process image. Please try with a clearer photo.", "error");
    } finally {
      setProcessing(false);
      setProcessingStatus("");
    }
  };

  // ==================== TEXT FORMATTING ====================
  
  const formatLyrics = () => {
    let formatted = editedText;
    formatted = formatted.replace(/[ \t]+/g, " ");
    
    const lines = formatted.split("\n");
    const lineFrequency = new Map();
    
    lines.forEach(line => {
      const normalized = line.toLowerCase().trim();
      if (normalized.length > 5) {
        lineFrequency.set(normalized, (lineFrequency.get(normalized) || 0) + 1);
      }
    });
    
    const formattedLines = lines.map(line => {
      const normalized = line.toLowerCase().trim();
      if (lineFrequency.get(normalized) >= 3 && !line.includes("**")) {
        return `**${line}**`;
      }
      return line;
    });
    
    handleTextChange(formattedLines.join("\n"));
    showNotification("🎵 Lyrics formatted! Repeated lines bolded.", "success");
  };

  const cleanFormatting = () => {
    const cleaned = editedText
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();
    handleTextChange(cleaned);
    showNotification("✨ Formatting cleaned!", "success");
  };

  const capitalizeLines = () => {
    const capitalized = editedText.split("\n").map(line => {
      if (line.trim()) {
        return line.split(" ").map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(" ");
      }
      return line;
    }).join("\n");
    handleTextChange(capitalized);
    showNotification("📝 All lines capitalized!", "success");
  };

  const addVerseNumbers = () => {
    const lines = editedText.split("\n");
    let verseNum = 1;
    let result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (trimmedLine === "") {
        result.push("");
        continue;
      }
      
      const isNewVerse = (i === 0) || (lines[i-1]?.trim() === "");
      
      if (isNewVerse) {
        result.push(`${verseNum}. ${line}`);
        verseNum++;
      } else {
        result.push(`   ${line}`);
      }
    }
    
    handleTextChange(result.join("\n"));
    showNotification(`🔢 Verse numbers added! Total: ${verseNum - 1} verses`, "success");
  };

  const removeVerseNumbers = () => {
    const cleaned = editedText.replace(/^\d+\.\s*/gm, "").replace(/^\s{3,}/gm, "");
    handleTextChange(cleaned);
    showNotification("❌ Verse numbers removed!", "success");
  };

  const fixCommonErrors = () => {
    let fixed = editedText;
    const corrections = {
      "0": "O", "1": "I", "5": "S", "8": "B",
      "rn": "m", "cl": "d", "vv": "w",
      "\\|": "I", "\\[": "I", "\\{": "I",
    };
    for (const [wrong, correct] of Object.entries(corrections)) {
      fixed = fixed.replace(new RegExp(wrong, "g"), correct);
    }
    handleTextChange(fixed);
    showNotification("🔧 Common OCR errors fixed!", "success");
  };

  const removeDuplicates = () => {
    const lines = editedText.split("\n");
    const seen = new Set();
    const unique = [];
    
    for (const line of lines) {
      const normalized = line.toLowerCase().trim();
      if (normalized === "") {
        unique.push(line);
      } else if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(line);
      }
    }
    
    handleTextChange(unique.join("\n"));
    showNotification("🗑️ Duplicate lines removed!", "success");
  };

  const copyToClipboard = async () => {
    if (!editedText.trim()) {
      showNotification("No text to copy", "warning");
      return;
    }
    
    try {
      await navigator.clipboard.writeText(editedText);
      showNotification(`📋 Copied to clipboard!`, "success");
    } catch (err) {
      showNotification("Failed to copy to clipboard.", "error");
    }
  };

  const saveToHymnBook = async () => {
    if (!editedText.trim()) {
      showNotification("No lyrics to save", "error");
      return;
    }
    
    const title = prompt("Enter hymn title:", editedText.split("\n")[0]?.substring(0, 100) || "Untitled");
    if (!title) return;
    
    const reference = prompt("Enter hymn reference (optional):", "");
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${BASE_URL}/api/admin/songs`,
        { title, reference: reference || null, lyrics: editedText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showNotification(`✅ Hymn "${title}" saved successfully!`, "success");
      setTimeout(() => navigate("/admin/hymns"), 1000);
      
    } catch (err) {
      showNotification("Failed to save hymn: " + (err.response?.data?.error || err.message), "error");
    }
  };

  const resetAll = () => {
    stopCameraTracks();
    setImage(null);
    setImagePreview(null);
    setExtractedText("");
    setEditedText("");
    setConfidence(0);
    setProcessingProgress(0);
    setStep("upload");
    setCrop(null);
    setCompletedCrop(null);
    setHistory([]);
    setHistoryIndex(-1);
    setRotationAngle(0);
    setCameraActive(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    showNotification("Reset complete! Start over with a new image.", "info");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ==================== YOUTUBE LYRICS EXTRACTION ====================
  
  const extractLyricsFromYouTube = async (videoId, videoTitle) => {
    if (!geminiReady || !model) {
      showNotification("AI not ready. Please wait for Gemini to initialize.", "warning");
      return null;
    }
    
    setExtractingYoutubeLyrics(true);
    showNotification(`🎬 Extracting lyrics from "${videoTitle}"...`, "info");
    
    try {
      const videoDetails = await getVideoDetails(videoId);
      
      if (videoDetails && videoDetails.snippet.description) {
        const lyricsFromDesc = await extractLyricsFromDescription(
          videoDetails.snippet.description,
          videoTitle
        );
        
        if (lyricsFromDesc && !lyricsFromDesc.includes("No lyrics found") && lyricsFromDesc.length > 50) {
          setEditedText(prev => prev + (prev ? "\n\n---\n" : "") + lyricsFromDesc);
          setActiveTab("scan");
          setStep("edit");
          showNotification(`✅ Lyrics extracted from "${videoTitle}"!`, "success");
          setExtractingYoutubeLyrics(false);
          return lyricsFromDesc;
        }
      }
      
      showNotification("No lyrics in description. Searching by song title...", "info");
      const lyricsByTitle = await searchLyricsByTitle(videoTitle);
      
      if (lyricsByTitle && !lyricsByTitle.includes("Lyrics not found") && lyricsByTitle.length > 50) {
        setEditedText(prev => prev + (prev ? "\n\n---\n" : "") + lyricsByTitle);
        setActiveTab("scan");
        setStep("edit");
        showNotification(`✅ Found lyrics for "${videoTitle}"!`, "success");
        setExtractingYoutubeLyrics(false);
        return lyricsByTitle;
      }
      
      showNotification(`⚠️ Could not find lyrics for "${videoTitle}". Try a different video.`, "warning");
      setExtractingYoutubeLyrics(false);
      return null;
      
    } catch (err) {
      console.error("YouTube extraction error:", err);
      showNotification("Failed to extract lyrics from YouTube", "error");
      setExtractingYoutubeLyrics(false);
      return null;
    }
  };

  const handleYouTubeUrl = async (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^/?]+)/,
      /youtube\.com\/v\/([^/?]+)/
    ];
    
    let videoId = null;
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }
    
    if (!videoId) {
      showNotification("Invalid YouTube URL", "error");
      return null;
    }
    
    const videoDetails = await getVideoDetails(videoId);
    if (videoDetails) {
      const title = videoDetails.snippet.title;
      return await extractLyricsFromYouTube(videoId, title);
    }
    return null;
  };

  const searchAndShowYouTube = async (query) => {
    if (!YOUTUBE_API_KEY) {
      showNotification("YouTube API key not configured", "error");
      return;
    }
    
    setChatLoading(true);
    try {
      const results = await searchYouTube(query);
      if (results && results.length > 0) {
        setYoutubeResults(results);
        setShowYoutubeModal(true);
        showNotification(`Found ${results.length} videos! Select one to extract lyrics.`, "success");
      } else {
        showNotification("No videos found. Try a different search.", "warning");
      }
    } catch (err) {
      showNotification("YouTube search failed", "error");
    } finally {
      setChatLoading(false);
    }
  };

  const handleYoutubeVideoSelect = async (video) => {
    setShowYoutubeModal(false);
    await extractLyricsFromYouTube(video.id.videoId, video.snippet.title);
  };

  const handleYoutubeVideoOpen = (videoId) => {
    window.open(`https://youtube.com/watch?v=${videoId}`, '_blank');
  };

  // ==================== AI CHAT PROCESSING ====================
  
  const processSuperAI = async (userMessage, conversationHistory) => {
    if (!geminiReady || !model) {
      return "⚠️ **AI Assistant is not ready**\n\nPlease check your Gemini API key configuration.";
    }
    
    const lowerMsg = userMessage.toLowerCase().trim();
    
    // Check for YouTube URL
    const youtubeUrlMatch = userMessage.match(/(youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeUrlMatch) {
      const lyrics = await handleYouTubeUrl(userMessage);
      if (lyrics) {
        return `🎬 **Lyrics extracted from YouTube video!**\n\nThe lyrics have been added to the editor above. You can now edit, format, or save them to the hymn book.`;
      } else {
        return `❌ Could not extract lyrics from that YouTube video. Try a different video or search by song title.`;
      }
    }
    
    // Check for YouTube search
    if ((lowerMsg.includes('youtube') || lowerMsg.includes('yt')) && 
        (lowerMsg.includes('search') || lowerMsg.includes('find'))) {
      const searchTerm = userMessage.replace(/youtube|yt|search|find|for|on/i, '').trim();
      if (searchTerm.length > 2) {
        await searchAndShowYouTube(searchTerm);
        return `🔍 Searching YouTube for "${searchTerm}"...\n\nA window will appear with results. Select a video to extract lyrics!`;
      }
    }
    
    // Lyrics search
    if ((lowerMsg.includes('find') || lowerMsg.includes('search') || lowerMsg.includes('get')) && 
        (lowerMsg.includes('lyrics') || lowerMsg.includes('song') || lowerMsg.includes('hymn'))) {
      let songTitle = userMessage.replace(/find|search|get|lyrics for|song|hymn/gi, '').trim();
      if (songTitle.length > 2) {
        const lyrics = await searchLyricsByTitle(songTitle);
        if (lyrics && !lyrics.includes("Lyrics not found") && lyrics.length > 50) {
          setEditedText(prev => prev + (prev ? "\n\n---\n" : "") + lyrics);
          setActiveTab("scan");
          setStep("edit");
          return `🎵 **Found lyrics for "${songTitle}"**\n\n${lyrics.substring(0, 500)}${lyrics.length > 500 ? '...' : ''}\n\n---\n✅ **Added to editor!**`;
        } else {
          return `🔍 I couldn't find lyrics for "${songTitle}". Try:\n• Searching YouTube (e.g., "Search YouTube for ${songTitle}")\n• Providing a YouTube URL\n• Pasting the lyrics manually`;
        }
      }
    }
    
    // Image extraction help
    if ((lowerMsg.includes('extract') || lowerMsg.includes('scan')) && 
        (lowerMsg.includes('image') || lowerMsg.includes('photo') || lowerMsg.includes('picture'))) {
      if (imagePreview) {
        return "📸 **To extract text from your image:**\n\n1. Go to the **Scan** tab\n2. Crop to the text area\n3. Click **Extract Lyrics**\n\nI'll help clean up the text afterward!";
      } else {
        return "📸 **To extract text from an image:**\n\n1. Go to **Scan** tab\n2. Upload or take a photo\n3. Crop to the text area\n4. Click **Extract Lyrics**";
      }
    }
    
    // General conversation
    const systemPrompt = `You are a friendly, helpful AI assistant named "ZUCA AI". You have a warm, conversational personality.

Keep responses natural, concise (2-4 sentences), and use emojis occasionally.

User: ${userMessage}

Respond naturally:`;

    try {
      const result = await model.generateContent(systemPrompt);
      let response = await result.response.text();
      if (userMessage.length < 20 && response.length > 500) {
        response = response.substring(0, 300) + '...';
      }
      return response;
    } catch (err) {
      // Fallback responses
      if (/^(hi|hello|hey|good morning|good afternoon|good evening)$/i.test(userMessage)) {
        return "👋 Hello! Good to see you! How can I help you today? 😊";
      }
      if (/how are you|how's it going/i.test(userMessage)) {
        return "I'm doing great, thanks for asking! 😊 Ready to help with lyrics, YouTube, or anything else!";
      }
      if (/thank|thanks/i.test(userMessage)) {
        return "You're very welcome! 🙏 Happy to help anytime!";
      }
      if (/bye|goodbye/i.test(userMessage)) {
        return "👋 Goodbye! Come back anytime! Have a blessed day!";
      }
      return "I'm here to help! 😊 You can ask me to:\n\n• Find lyrics (\"Find lyrics for Amazing Grace\")\n• Extract from YouTube (paste a YouTube URL)\n• Search YouTube (\"Search YouTube for hymns\")\n• Extract text from images (upload on Scan tab)\n\nWhat would you like?";
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    const newMessage = {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput("");
    setChatLoading(true);
    
    setConversationContext(prev => [...prev, userMessage].slice(-10));
    
    try {
      const response = await processSuperAI(userMessage, conversationContext);
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: response,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages(prev => [...prev, {
        id: Date.now(),
        role: "assistant",
        content: "😊 I'm here! Ask me for lyrics, YouTube videos, or just chat!",
        timestamp: new Date()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const clearConversation = () => {
    setConversationContext([]);
    setChatMessages([{
      id: Date.now(),
      role: "assistant",
      content: "🧠 **Conversation cleared!** I'm ready to help with anything!\n\n• Find lyrics\n• Extract from YouTube\n• Search YouTube\n• Chat normally",
      timestamp: new Date()
    }]);
    showNotification("Conversation cleared", "info");
  };

  const handleChatKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getVerseCount = () => editedText.split("\n\n").filter(v => v.trim()).length;
  const getLineCount = () => editedText.split("\n").filter(l => l.trim()).length;
  const getWordCount = () => editedText.split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div style={containerStyle}>
      <div style={overlayStyle}></div>
      
      {notification && (
        <div style={{
          ...notificationStyle,
          background: notification.type === "success" ? "#10b981" : 
                     notification.type === "error" ? "#ef4444" : 
                     notification.type === "warning" ? "#f59e0b" : "#3b82f6"
        }}>
          {notification.type === "success" && <FiCheck size={18} />}
          {notification.type === "error" && <FiAlertCircle size={18} />}
          {notification.type === "info" && <FiLoader size={18} className="spinning" />}
          {notification.type === "warning" && <FiAlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}
      
      <div style={contentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <button onClick={() => navigate(-1)} style={backBtnStyle}>
            <FiArrowLeft size={20} /> Back
          </button>
          <h1 style={titleStyle}>🎵 ZUCA Lyrics Assistant</h1>
          <button onClick={toggleFullscreen} style={fullscreenBtnStyle}>
            {isFullscreen ? <FiX size={20} /> : <FiMaximize />}
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={tabContainerStyle}>
          <button 
            onClick={() => setActiveTab("scan")} 
            style={{...tabStyle, ...(activeTab === "scan" ? activeTabStyle : {})}}
          >
            <FiCamera size={16} /> Scan Lyrics
          </button>
          <button 
            onClick={() => setActiveTab("chat")} 
            style={{...tabStyle, ...(activeTab === "chat" ? activeTabStyle : {})}}
          >
            <FiMessageSquare size={16} /> AI Assistant
          </button>
        </div>

        {/* Tab 1: Scan Lyrics from Image */}
        {activeTab === "scan" && (
          <>
            {step === "upload" && (
              <div style={uploadContainerStyle}>
                {tesseractLoading && (
                  <div style={loadingCardStyle}>
                    <FiLoader size={24} className="spinning" />
                    <span>Loading OCR engine... Please wait (one-time setup)</span>
                  </div>
                )}
                
                <div style={uploadGridStyle}>
                  <div style={uploadCardStyle} onClick={() => fileInputRef.current?.click()}>
                    <FiUpload size={48} color="#a78bfa" />
                    <h3>Upload Image</h3>
                    <p>Select from gallery</p>
                    <small>JPG, PNG, WebP</small>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </div>

                  <div style={uploadCardStyle} onClick={startCamera}>
                    <FiCamera size={48} color="#a78bfa" />
                    <h3>Take Photo</h3>
                    <p>Use camera</p>
                    <small>Best with good lighting</small>
                  </div>
                </div>

                <div style={settingsCardStyle}>
                  <label>🌐 Language:</label>
                  <select 
                    value={detectedLanguage} 
                    onChange={(e) => setDetectedLanguage(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="eng">🇬🇧 English</option>
                    <option value="swa">🇰🇪 Swahili</option>
                    <option value="lat">🏛️ Latin</option>
                  </select>
                </div>

                <div style={tipsCardStyle}>
                  <h4>💡 Tips for best results:</h4>
                  <div style={tipsGridStyle}>
                    <span>📸 Good lighting - avoid shadows</span>
                    <span>📏 Keep the book flat and steady</span>
                    <span>🔍 Make sure text is in focus</span>
                    <span>📄 Capture one verse at a time</span>
                    <span>🎬 Paste YouTube URL in AI Assistant</span>
                    <span>✏️ Use editing tools after extraction</span>
                  </div>
                </div>
              </div>
            )}

           {step === "camera" && (
  <div style={cameraContainerStyle}>
    <div style={cameraViewStyle}>
      <video 
        ref={videoRef}
        style={{
          width: "100%",
          height: "auto",
          minHeight: "400px",
          backgroundColor: "#000",
          display: "block"
        }}
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
    <div style={cameraControlsStyle}>
      <button onClick={stopCamera} style={cancelBtnStyle}>
        <FiX size={18} /> Cancel
      </button>
      <button onClick={capturePhoto} style={captureBtnStyle}>
        <FiCamera size={18} /> Capture Photo
      </button>
    </div>
  </div>
)}

            {step === "crop" && imagePreview && (
              <div style={cropContainerStyle}>
                <div style={cropHeaderStyle}>
                  <h3 style={cropTitleStyle}>✂️ Crop & Rotate Image</h3>
                  <p style={cropSubtitleStyle}>Drag corners to select lyrics area, or rotate if needed</p>
                </div>
                
                <div style={cropToolbarStyle}>
                  <button onClick={handleRotate} style={cropToolBtnStyle}>
                    <FiRotateCw size={18} /> Rotate 90°
                  </button>
                </div>
                
                <div style={cropAreaStyle}>
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={undefined}
                  >
                    <img
                      ref={imgRef}
                      src={imagePreview}
                      alt="Crop preview"
                      style={cropImageStyle}
                      onLoad={onImageLoad}
                    />
                  </ReactCrop>
                </div>
                
                <div style={cropActionsStyle}>
                  <button onClick={skipCrop} style={skipBtnStyle}>
                    Skip Crop
                  </button>
                  <button onClick={applyCrop} style={applyBtnStyle}>
                    <FiCheck size={18} /> Apply Crop
                  </button>
                </div>
              </div>
            )}

            {step === "process" && imagePreview && (
              <div style={processContainerStyle}>
                <div style={processCardStyle}>
                  <img src={imagePreview} alt="Preview" style={previewImageStyle} />
                  <button onClick={resetAll} style={resetBtnStyle}>
                    <FiRefreshCw /> Change Image
                  </button>
                  
                  <div style={ocrControlsStyle}>
                    <button onClick={processOCR} disabled={processing || !tesseractReady} style={processBtnStyle}>
                      {processing ? (
                        <>
                          <FiLoader className="spinning" />
                          {processingStatus || `Processing... ${processingProgress}%`}
                        </>
                      ) : (
                        <>
                          <FiImage />
                          Extract Lyrics
                        </>
                      )}
                    </button>
                  </div>
                  
                  {processing && processingProgress > 0 && (
                    <div style={progressBarStyle}>
                      <div style={{ ...progressFillStyle, width: `${processingProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === "edit" && (
              <div style={editContainerStyle}>
                <div style={confidenceStyle}>
                  <span>🎯 Confidence: </span>
                  <strong style={{ 
                    color: confidence > 80 ? "#10b981" : confidence > 50 ? "#f59e0b" : "#ef4444",
                    fontSize: "18px"
                  }}>
                    {confidence}%
                  </strong>
                  <span style={{ marginLeft: "auto", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                    {getWordCount()} words extracted
                  </span>
                </div>

                <div style={toolbarStyle}>
                  <button onClick={() => { if (historyIndex > 0) { const newIndex = historyIndex - 1; setHistoryIndex(newIndex); setEditedText(history[newIndex]); } }} style={toolBtnStyle}>
                    <FiCornerUpLeft /> Undo
                  </button>
                  <button onClick={() => { if (historyIndex < history.length - 1) { const newIndex = historyIndex + 1; setHistoryIndex(newIndex); setEditedText(history[newIndex]); } }} style={toolBtnStyle}>
                    <FiCornerUpRight /> Redo
                  </button>
                  <div style={dividerStyle}></div>
                  <button onClick={cleanFormatting} style={toolBtnStyle}>
                    <FiRefreshCw /> Clean
                  </button>
                  <button onClick={formatLyrics} style={toolBtnStyle}>
                    <FiBold /> Bold Chorus
                  </button>
                  <button onClick={capitalizeLines} style={toolBtnStyle}>
                    <FiAlignLeft /> Capitalize
                  </button>
                  <button onClick={addVerseNumbers} style={toolBtnStyle}>
                    <FiList /> Add Numbers
                  </button>
                  <button onClick={removeVerseNumbers} style={toolBtnStyle}>
                    <FiX /> Remove Numbers
                  </button>
                  <button onClick={fixCommonErrors} style={toolBtnStyle}>
                    <MdOutlineAutoAwesome /> Fix OCR
                  </button>
                  <button onClick={removeDuplicates} style={toolBtnStyle}>
                    <FiTrash2 /> Remove Dups
                  </button>
                  <button onClick={copyToClipboard} style={toolBtnStyleCopy}>
                    <FiCopy /> Copy
                  </button>
                </div>

                <div style={statsStyle}>
                  <span>📊 {getVerseCount()} verses</span>
                  <span>📝 {getLineCount()} lines</span>
                  <span>📖 {getWordCount()} words</span>
                  <span>⏱️ ~{Math.ceil(getWordCount() / 200)} min read</span>
                  {historyIndex >= 0 && <span>💾 {historyIndex + 1}/{history.length} changes</span>}
                </div>

                <textarea
                  value={editedText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  style={textareaStyle}
                  rows={15}
                  placeholder="Extracted lyrics will appear here..."
                />

                <div style={actionBarStyle}>
                  <button onClick={resetAll} style={resetButtonStyle}>
                    <FiRefreshCw /> Start Over
                  </button>
                  <button onClick={saveToHymnBook} style={saveButtonStyle}>
                    <FiSave /> Save to Hymn Book
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab 2: AI Assistant */}
        {activeTab === "chat" && (
          <div style={chatContainerStyle}>
            <div style={chatHeaderStyle}>
              <div style={chatHeaderLeftStyle}>
                <FiMessageSquare size={20} />
                <span>🧠 ZUCA AI Assistant</span>
                {geminiReady && <span style={statusBadgeStyle}>● Online</span>}
              </div>
              <button onClick={clearConversation} style={chatClearBtnStyle} title="Clear conversation">
                <FiTrash size={16} />
              </button>
            </div>
            
            <div style={chatMessagesStyle} ref={chatContainerRef}>
              {chatMessages.map((msg) => (
                <div key={msg.id} style={{
                  ...chatMessageStyle,
                  ...(msg.role === "user" ? chatUserStyle : chatAssistantStyle)
                }}>
                  <div style={chatAvatarStyle}>
                    {msg.role === "user" ? "👤" : "🧠"}
                  </div>
                  <div style={chatBubbleStyle}>
                    <div style={chatTextStyle}>{msg.content}</div>
                    <div style={chatTimeStyle}>{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={chatTypingContainerStyle}>
                  <div style={chatAvatarStyle}>🧠</div>
                  <div style={chatTypingBubbleStyle}>
                    <div style={typingDotStyle}></div>
                    <div style={typingDotStyle}></div>
                    <div style={typingDotStyle}></div>
                  </div>
                </div>
              )}
              {extractingYoutubeLyrics && (
                <div style={chatTypingContainerStyle}>
                  <div style={chatAvatarStyle}>🎬</div>
                  <div style={chatTypingBubbleStyle}>
                    <div style={typingDotStyle}></div>
                    <div style={typingDotStyle}></div>
                    <div style={typingDotStyle}></div>
                    <span style={{ marginLeft: "8px", fontSize: "12px" }}>Extracting lyrics from YouTube...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div style={chatInputContainerStyle}>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleChatKeyPress}
                placeholder="Ask me ANYTHING! Find lyrics, extract from YouTube, chat normally... Try: 'Extract lyrics from https://youtube.com/watch?v=...' or 'Good morning!'"
                style={chatInputStyle}
                rows={2}
              />
              <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()} style={chatSendBtnStyle}>
                <FiSend size={20} />
              </button>
            </div>
            
            <div style={chatSuggestionsStyle}>
              <p style={suggestionsTitleStyle}>💡 Try these:</p>
              <div style={suggestionsGridStyle}>
                <button onClick={() => setChatInput("Good morning! How are you?")} style={suggestionBtnStyle}>
                  👋 Greeting
                </button>
                <button onClick={() => setChatInput("Find lyrics for Amazing Grace")} style={suggestionBtnStyle}>
                  🎵 Find Lyrics
                </button>
                <button onClick={() => setChatInput("Search YouTube for How Great Thou Art")} style={suggestionBtnStyle}>
                  🎬 Search YouTube
                </button>
                <button onClick={() => setChatInput("Tell me a joke")} style={suggestionBtnStyle}>
                  😂 Tell Joke
                </button>
                <button onClick={() => setChatInput("What is faith?")} style={suggestionBtnStyle}>
                  📚 Explain
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* YouTube Results Modal */}
      {showYoutubeModal && youtubeResults.length > 0 && (
        <div style={modalOverlayStyle} onClick={() => setShowYoutubeModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={{ color: "white" }}>🎬 YouTube Results</h3>
              <button onClick={() => setShowYoutubeModal(false)} style={modalCloseBtnStyle}>✕</button>
            </div>
            <div style={modalBodyStyle}>
              {youtubeResults.map((video, idx) => (
                <div key={idx} style={youtubeResultStyle}>
                  <img src={video.snippet.thumbnails.default.url} alt={video.snippet.title} style={youtubeThumbStyle} />
                  <div style={youtubeInfoStyle}>
                    <div style={youtubeTitleStyle}>{video.snippet.title}</div>
                    <div style={youtubeChannelStyle}>{video.snippet.channelTitle}</div>
                    <div style={youtubeButtonGroupStyle}>
                      <button onClick={() => handleYoutubeVideoSelect(video)} style={youtubeExtractBtnStyle}>
                        <FiMusic size={12} /> Extract Lyrics
                      </button>
                      <button onClick={() => handleYoutubeVideoOpen(video.id.videoId)} style={youtubeOpenBtnStyle}>
                        <FiExternalLink size={12} /> Open in YouTube
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

// Helper icon
const FiMaximize = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

// ==================== STYLES ====================

const containerStyle = {
  minHeight: "100vh",
  position: "relative",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)",
  zIndex: 0,
};

const notificationStyle = {
  position: "fixed",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10000,
  padding: "12px 24px",
  borderRadius: "50px",
  color: "white",
  fontSize: "14px",
  fontWeight: "500",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
};

const contentStyle = {
  position: "relative",
  zIndex: 2,
  maxWidth: "1000px",
  margin: "0 auto",
  padding: "30px 24px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
};

const backBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 20px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "40px",
  color: "white",
  cursor: "pointer",
};

const fullscreenBtnStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const titleStyle = {
  fontSize: "24px",
  fontWeight: "700",
  background: "linear-gradient(135deg, #a78bfa, #f472b6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  margin: 0,
};

const tabContainerStyle = {
  display: "flex",
  gap: "12px",
  marginBottom: "30px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: "12px",
};

const tabStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 24px",
  background: "transparent",
  border: "none",
  borderRadius: "30px",
  color: "rgba(255,255,255,0.6)",
  fontSize: "15px",
  fontWeight: "500",
  cursor: "pointer",
  transition: "all 0.2s",
};

const activeTabStyle = {
  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
  color: "white",
};

// Upload styles
const uploadContainerStyle = {
  maxWidth: "600px",
  margin: "0 auto",
};

const loadingCardStyle = {
  background: "rgba(59,130,246,0.2)",
  border: "1px solid rgba(59,130,246,0.3)",
  borderRadius: "12px",
  padding: "12px 20px",
  marginBottom: "20px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "#93c5fd",
};

const uploadGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "24px",
  marginBottom: "24px",
};

const uploadCardStyle = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "20px",
  padding: "40px 20px",
  textAlign: "center",
  cursor: "pointer",
  color: "white",
};

const settingsCardStyle = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: "16px",
  padding: "16px 20px",
  marginBottom: "20px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  color: "white",
  flexWrap: "wrap",
};

const selectStyle = {
  padding: "8px 16px",
  borderRadius: "8px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "white",
  cursor: "pointer",
};

const tipsCardStyle = {
  background: "rgba(16,185,129,0.1)",
  border: "1px solid rgba(16,185,129,0.2)",
  borderRadius: "16px",
  padding: "16px 20px",
  color: "white",
};

const tipsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "8px",
  marginTop: "12px",
  fontSize: "13px",
  color: "rgba(255,255,255,0.7)",
};

// REPLACE THIS cameraContainerStyle (around line 1450)
const cameraContainerStyle = {
  textAlign: "center",
  maxWidth: "100%",
  margin: "0 auto",
  padding: "16px",
  backgroundColor: "#000",
  borderRadius: "16px",
};

// REPLACE THIS cameraViewStyle
const cameraViewStyle = {
  position: "relative",
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#000",
  borderRadius: "12px",
  overflow: "hidden",
  minHeight: "400px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// REPLACE THIS videoStyle
const videoStyle = {
  width: "100%",
  height: "auto",
  minHeight: "400px",
  maxHeight: "70vh",
  objectFit: "cover",
  display: "block",
  backgroundColor: "#000",
};
const cameraControlsStyle = {
  display: "flex",
  gap: "16px",
  justifyContent: "center",
};

const captureBtnStyle = {
  padding: "12px 24px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "40px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const cancelBtnStyle = {
  padding: "12px 24px",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "40px",
  cursor: "pointer",
};

// Crop styles
const cropContainerStyle = {
  maxWidth: "800px",
  margin: "0 auto",
};

const cropHeaderStyle = {
  textAlign: "center",
  marginBottom: "20px",
};

const cropTitleStyle = {
  fontSize: "22px",
  fontWeight: "600",
  color: "white",
  marginBottom: "8px",
};

const cropSubtitleStyle = {
  fontSize: "14px",
  color: "rgba(255,255,255,0.6)",
};

const cropToolbarStyle = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "16px",
};

const cropToolBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 20px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "30px",
  color: "white",
  cursor: "pointer",
};

const cropAreaStyle = {
  background: "rgba(0,0,0,0.5)",
  borderRadius: "16px",
  padding: "20px",
  marginBottom: "20px",
  display: "flex",
  justifyContent: "center",
};

const cropImageStyle = {
  maxWidth: "100%",
  maxHeight: "60vh",
  objectFit: "contain",
};

const cropActionsStyle = {
  display: "flex",
  gap: "16px",
  justifyContent: "center",
};

const skipBtnStyle = {
  padding: "10px 24px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "40px",
  color: "white",
  cursor: "pointer",
};

const applyBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 24px",
  background: "#10b981",
  border: "none",
  borderRadius: "40px",
  color: "white",
  cursor: "pointer",
};

// Process styles
const processContainerStyle = {
  maxWidth: "500px",
  margin: "0 auto",
  textAlign: "center",
};

const processCardStyle = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: "20px",
  padding: "24px",
};

const previewImageStyle = {
  width: "100%",
  maxHeight: "300px",
  objectFit: "contain",
  borderRadius: "12px",
  marginBottom: "16px",
};

const resetBtnStyle = {
  padding: "8px 16px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "30px",
  color: "white",
  cursor: "pointer",
  marginBottom: "20px",
};

const ocrControlsStyle = {
  marginTop: "16px",
};

const processBtnStyle = {
  width: "100%",
  padding: "14px",
  background: "#10b981",
  color: "white",
  border: "none",
  borderRadius: "40px",
  fontSize: "16px",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const progressBarStyle = {
  height: "6px",
  background: "rgba(255,255,255,0.1)",
  borderRadius: "3px",
  overflow: "hidden",
  marginTop: "16px",
};

const progressFillStyle = {
  height: "100%",
  background: "linear-gradient(90deg, #8b5cf6, #2563eb)",
  transition: "width 0.3s",
};

// Edit styles
const editContainerStyle = {
  maxWidth: "800px",
  margin: "0 auto",
};

const confidenceStyle = {
  padding: "12px 16px",
  background: "rgba(255,255,255,0.05)",
  borderRadius: "12px",
  marginBottom: "20px",
  color: "white",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "8px",
};

const toolbarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "20px",
  paddingBottom: "16px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const toolBtnStyle = {
  padding: "8px 16px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "30px",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const toolBtnStyleCopy = {
  padding: "8px 16px",
  background: "rgba(139,92,246,0.2)",
  border: "1px solid rgba(139,92,246,0.3)",
  borderRadius: "30px",
  color: "#a78bfa",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const dividerStyle = {
  width: "1px",
  height: "30px",
  background: "rgba(255,255,255,0.2)",
  margin: "0 4px",
};

const statsStyle = {
  display: "flex",
  gap: "20px",
  marginBottom: "16px",
  padding: "10px 16px",
  background: "rgba(37,99,235,0.15)",
  borderRadius: "12px",
  color: "rgba(255,255,255,0.7)",
  fontSize: "13px",
  flexWrap: "wrap",
};

const textareaStyle = {
  width: "100%",
  padding: "20px",
  background: "#0a0a1a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "16px",
  color: "white",
  fontSize: "14px",
  lineHeight: "1.6",
  fontFamily: "monospace",
  marginBottom: "20px",
};

const actionBarStyle = {
  display: "flex",
  gap: "16px",
  justifyContent: "flex-end",
};

const resetButtonStyle = {
  padding: "12px 24px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "40px",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const saveButtonStyle = {
  padding: "12px 28px",
  background: "#2563eb",
  border: "none",
  borderRadius: "40px",
  color: "white",
  fontWeight: "600",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

// Chat styles
const chatContainerStyle = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.1)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  height: "600px",
};

const chatHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  background: "rgba(0,0,0,0.3)",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const chatHeaderLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "white",
  fontWeight: "600",
};

const statusBadgeStyle = {
  fontSize: "11px",
  color: "#10b981",
  background: "rgba(16,185,129,0.2)",
  padding: "2px 8px",
  borderRadius: "20px",
};

const chatClearBtnStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.1)",
  border: "none",
  color: "rgba(255,255,255,0.6)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const chatMessagesStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const chatMessageStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
};

const chatUserStyle = {
  flexDirection: "row-reverse",
};

const chatAssistantStyle = {};

const chatAvatarStyle = {
  width: "36px",
  height: "36px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  flexShrink: 0,
};

const chatBubbleStyle = {
  maxWidth: "75%",
  padding: "12px 16px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.9)",
  lineHeight: "1.5",
  fontSize: "14px",
};

const chatTextStyle = {
  whiteSpace: "pre-wrap",
};

const chatTimeStyle = {
  fontSize: "10px",
  color: "rgba(255,255,255,0.4)",
  marginTop: "6px",
  textAlign: "right",
};

const chatTypingContainerStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
};

const chatTypingBubbleStyle = {
  padding: "12px 16px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.08)",
  display: "flex",
  gap: "6px",
};

const typingDotStyle = {
  width: "8px",
  height: "8px",
  borderRadius: "4px",
  background: "rgba(255,255,255,0.5)",
  animation: "typing 1.4s infinite ease-in-out",
};

const chatInputContainerStyle = {
  display: "flex",
  gap: "12px",
  padding: "16px 20px",
  borderTop: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.2)",
};

const chatInputStyle = {
  flex: 1,
  padding: "12px 16px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "24px",
  color: "white",
  fontSize: "14px",
  resize: "none",
  fontFamily: "inherit",
};

const chatSendBtnStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "22px",
  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
  border: "none",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const chatSuggestionsStyle = {
  padding: "16px 20px",
  borderTop: "1px solid rgba(255,255,255,0.05)",
  background: "rgba(0,0,0,0.15)",
};

const suggestionsTitleStyle = {
  fontSize: "12px",
  color: "rgba(255,255,255,0.5)",
  marginBottom: "10px",
};

const suggestionsGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const suggestionBtnStyle = {
  padding: "8px 16px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "30px",
  color: "rgba(255,255,255,0.8)",
  fontSize: "13px",
  cursor: "pointer",
};

// Modal styles
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.8)",
  backdropFilter: "blur(5px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  padding: "20px",
};

const modalContentStyle = {
  background: "#1e293b",
  borderRadius: "20px",
  width: "100%",
  maxWidth: "500px",
  maxHeight: "80vh",
  overflow: "hidden",
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const modalCloseBtnStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.1)",
  border: "none",
  color: "white",
  cursor: "pointer",
};

const modalBodyStyle = {
  padding: "16px",
  overflowY: "auto",
  maxHeight: "calc(80vh - 60px)",
};

const youtubeResultStyle = {
  display: "flex",
  gap: "12px",
  padding: "12px",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  alignItems: "center",
};

const youtubeThumbStyle = {
  width: "80px",
  height: "60px",
  objectFit: "cover",
  borderRadius: "8px",
};

const youtubeInfoStyle = {
  flex: 1,
};

const youtubeTitleStyle = {
  color: "white",
  fontSize: "13px",
  fontWeight: "500",
  marginBottom: "4px",
};

const youtubeChannelStyle = {
  color: "rgba(255,255,255,0.6)",
  fontSize: "11px",
  marginBottom: "8px",
};

const youtubeButtonGroupStyle = {
  display: "flex",
  gap: "8px",
};

const youtubeExtractBtnStyle = {
  padding: "4px 10px",
  background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
  border: "none",
  borderRadius: "20px",
  color: "white",
  fontSize: "10px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "4px",
};

const youtubeOpenBtnStyle = {
  padding: "4px 10px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "20px",
  color: "rgba(255,255,255,0.8)",
  fontSize: "10px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "4px",
};