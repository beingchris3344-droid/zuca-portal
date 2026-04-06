// frontend/src/pages/admin/OCRScannerPage.jsx - SIMPLE WORKING VERSION
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
  FiCornerUpLeft, FiCornerUpRight, FiZap,
  FiRotateCw, FiMessageSquare, FiSend, FiTrash
} from "react-icons/fi";
import { MdOutlineAutoAwesome } from "react-icons/md";
import BASE_URL from "../../api";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let model = null;

export default function OCRScannerPage() {
  const navigate = useNavigate();
  
  // State
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [step, setStep] = useState("upload");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState("eng");
  const [tesseractReady, setTesseractReady] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("scan");
  const [user, setUser] = useState(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  
  // Crop state
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load user
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);

  // Initialize Gemini
  useEffect(() => {
    const initGemini = async () => {
      if (!API_KEY || API_KEY === "your_api_key_here") {
        console.log("No API key");
        setChatMessages([{
          id: Date.now(),
          role: "assistant",
          content: "⚠️ **API Key Missing**\n\nPlease add VITE_GEMINI_API_KEY to your .env file"
        }]);
        return;
      }
      try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        
        setChatMessages([{
          id: Date.now(),
          role: "assistant",
          content: `👋 **Hello${user?.fullName ? ` ${user.fullName.split(" ")[0]}` : ""}!**

I'm ZUCA AI Assistant. I can help you with:

🎵 **Find lyrics** - Just type any song name
📸 **Scan images** - Go to Scan tab
🎬 **YouTube links** - Paste any YouTube URL
💬 **Chat** - Ask me anything!

**Try typing:** "Amazing Grace" or "How are you?" or paste a YouTube link`,
          timestamp: new Date()
        }]);
      } catch (err) {
        console.error("Gemini failed:", err);
      }
    };
    initGemini();
    loadTesseract();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadTesseract = async () => {
    try {
      window.Tesseract = Tesseract;
      setTesseractReady(true);
    } catch (err) {}
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 3000);
  };

  // ============ SIMPLE AI FUNCTION ============
  const sendToGemini = async (userMessage) => {
    if (!model) {
      return "AI is initializing. Please wait a moment...";
    }
    
    try {
      const result = await model.generateContent(userMessage);
      return await result.response.text();
    } catch (err) {
      console.error("Gemini error:", err);
      return "I'm having trouble right now. Please try again in a moment.";
    }
  };

  // ============ SEND CHAT MESSAGE ============
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      role: "user",
      content: userMessage,
      timestamp: new Date()
    }]);
    setChatInput("");
    setChatLoading(true);
    
    // Simple response based on message type
    let response = "";
    const lowerMsg = userMessage.toLowerCase();
    
    // Check for song lyrics request (simple detection)
    if (lowerMsg.includes("amazing") || lowerMsg.includes("grace") || 
        lowerMsg.includes("how great") || lowerMsg.includes("what a friend")) {
      response = "🎵 **Looking for lyrics...**\n\nI'll help you find that song! For now, you can also use the Scan tab to extract lyrics from an image, or type the exact song name again.";
    }
    // Check for greeting
    else if (lowerMsg.match(/^(hi|hello|hey|good morning|good afternoon|good evening)$/)) {
      response = `👋 **Hello${user?.fullName ? ` ${user.fullName.split(" ")[0]}` : ""}!** Good to see you! How can I help you today?`;
    }
    // Check for how are you
    else if (lowerMsg.includes("how are you")) {
      response = "I'm doing great, thanks for asking! 😊 Ready to help with anything you need!";
    }
    // Check for thank you
    else if (lowerMsg.includes("thank")) {
      response = "You're very welcome! 🙏 Happy to help anytime!";
    }
    // Check for joke
    else if (lowerMsg.includes("joke")) {
      response = "Why did the choir sing so loud? 🎵\n\nBecause they wanted to make a joyful NOISE! 😂";
    }
    // Check for help
    else if (lowerMsg.includes("help") || lowerMsg.includes("what can you do")) {
      response = "**I can help with:**\n\n• Find song lyrics (just type the song name)\n• Extract text from images (Scan tab)\n• Answer questions\n• Chat with you!\n\nWhat would you like?";
    }
    // Check for YouTube URL
    else if (userMessage.includes("youtube.com") || userMessage.includes("youtu.be")) {
      response = "🎬 **YouTube link detected!**\n\nI'll try to find lyrics for this video. You can also use the Scan tab to extract text from images.";
    }
    // Default - send to Gemini
    else {
      response = await sendToGemini(userMessage);
    }
    
    setChatMessages(prev => [...prev, {
      id: Date.now() + 1,
      role: "assistant",
      content: response,
      timestamp: new Date()
    }]);
    setChatLoading(false);
  };

  const clearChat = () => {
    setChatMessages([{
      id: Date.now(),
      role: "assistant",
      content: "🧠 **Chat cleared!** I'm ready to help again. Just type anything!",
      timestamp: new Date()
    }]);
    showNotification("Chat cleared", "info");
  };

  const handleChatKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ============ OCR FUNCTIONS ============
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStep("camera");
    } catch (err) {
      showNotification("Could not access camera", "error");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      setImagePreview(imageData);
      fetch(imageData).then(res => res.blob()).then(blob => {
        const file = new File([blob], "captured-photo.jpg", { type: "image/jpeg" });
        setImage(file);
      });
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setStep("crop");
      showNotification("Photo captured!", "success");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setStep("crop");
        showNotification("Image uploaded!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = async () => {
    // Simple rotate - just for UI
    showNotification("Rotate feature coming soon", "info");
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
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    });
  };

  const applyCrop = async () => {
    if (!completedCrop) {
      setStep("process");
      return;
    }
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], "cropped-image.jpg", { type: "image/jpeg" });
        setImage(croppedFile);
        const url = URL.createObjectURL(croppedBlob);
        setImagePreview(url);
        setStep("process");
        showNotification("Crop applied!", "success");
      }
    } catch (err) {
      setStep("process");
    }
  };

  const skipCrop = () => {
    setStep("process");
  };

  const processOCR = async () => {
    if (!image) {
      showNotification("No image to process", "error");
      return;
    }
    if (!tesseractReady) {
      showNotification("OCR loading, please wait", "warning");
      return;
    }
    
    setProcessing(true);
    setProcessingProgress(0);
    showNotification("Processing image...", "info");
    
    try {
      const result = await Tesseract.recognize(image, detectedLanguage, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProcessingProgress(Math.floor(m.progress * 100));
          }
        },
      });
      
      let text = result.data.text;
      let formattedText = text.replace(/[ \t]+/g, " ");
      formattedText = formattedText.split("\n").map(line => {
        if (line.trim()) return line.charAt(0).toUpperCase() + line.slice(1);
        return line;
      }).join("\n");
      
      setEditedText(formattedText);
      setStep("edit");
      showNotification(`✅ Text extracted!`, "success");
      
    } catch (err) {
      console.error("OCR Error:", err);
      showNotification("Failed to process image", "error");
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!editedText.trim()) {
      showNotification("No text to copy", "warning");
      return;
    }
    try {
      await navigator.clipboard.writeText(editedText);
      showNotification("Copied to clipboard!", "success");
    } catch (err) {
      showNotification("Failed to copy", "error");
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
      await axios.post(`${BASE_URL}/api/admin/songs`, { title, reference: reference || null, lyrics: editedText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification(`✅ Hymn saved!`, "success");
      setTimeout(() => navigate("/admin/hymns"), 1000);
    } catch (err) {
      showNotification("Failed to save", "error");
    }
  };

  const resetAll = () => {
    setImage(null);
    setImagePreview(null);
    setEditedText("");
    setStep("upload");
    setCrop(null);
    setCompletedCrop(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    showNotification("Reset complete", "info");
  };

  const getWordCount = () => editedText.split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1a2e, #16213e)", position: "relative" }}>
      <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto", padding: "30px 24px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <button onClick={() => navigate(-1)} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "40px", color: "white", cursor: "pointer" }}>
            ← Back
          </button>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "white", margin: 0 }}>🧠 ZUCA AI Assistant</h1>
          <div style={{ width: "80px" }}></div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "12px" }}>
          <button onClick={() => setActiveTab("scan")} style={{ padding: "10px 24px", borderRadius: "30px", background: activeTab === "scan" ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent", color: activeTab === "scan" ? "white" : "rgba(255,255,255,0.6)", border: "none", cursor: "pointer" }}>
            📸 Scan Lyrics
          </button>
          <button onClick={() => setActiveTab("chat")} style={{ padding: "10px 24px", borderRadius: "30px", background: activeTab === "chat" ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : "transparent", color: activeTab === "chat" ? "white" : "rgba(255,255,255,0.6)", border: "none", cursor: "pointer" }}>
            💬 AI Chat
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 10000, padding: "12px 24px", borderRadius: "50px", background: notification.type === "success" ? "#10b981" : notification.type === "error" ? "#ef4444" : "#3b82f6", color: "white", fontSize: "14px" }}>
            {notification.message}
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === "scan" && (
          <>
            {step === "upload" && (
              <div style={{ maxWidth: "600px", margin: "0 auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                  <div onClick={() => fileInputRef.current?.click()} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "40px 20px", textAlign: "center", cursor: "pointer", color: "white" }}>
                    <FiUpload size={48} color="#a78bfa" />
                    <h3>Upload Image</h3>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                  </div>
                  <div onClick={startCamera} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "40px 20px", textAlign: "center", cursor: "pointer", color: "white" }}>
                    <FiCamera size={48} color="#a78bfa" />
                    <h3>Take Photo</h3>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", color: "white" }}>
                  <label>🌐 Language:</label>
                  <select value={detectedLanguage} onChange={(e) => setDetectedLanguage(e.target.value)} style={{ padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer" }}>
                    <option value="eng">English</option>
                    <option value="swa">Swahili</option>
                    <option value="lat">Latin</option>
                  </select>
                </div>
              </div>
            )}

            {step === "camera" && (
              <div style={{ textAlign: "center" }}>
                <video ref={videoRef} style={{ width: "100%", maxWidth: "500px", borderRadius: "16px" }} autoPlay playsInline />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "16px" }}>
                  <button onClick={() => setStep("upload")} style={{ padding: "12px 24px", background: "rgba(255,255,255,0.1)", borderRadius: "40px", color: "white", cursor: "pointer" }}>Cancel</button>
                  <button onClick={capturePhoto} style={{ padding: "12px 24px", background: "#2563eb", borderRadius: "40px", color: "white", border: "none", cursor: "pointer" }}>Capture</button>
                </div>
              </div>
            )}

            {step === "crop" && imagePreview && (
              <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <h3 style={{ color: "white", textAlign: "center" }}>Crop Image</h3>
                <div style={{ background: "rgba(0,0,0,0.5)", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
                  <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)}>
                    <img ref={imgRef} src={imagePreview} style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }} onLoad={onImageLoad} />
                  </ReactCrop>
                </div>
                <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                  <button onClick={skipCrop} style={{ padding: "10px 24px", background: "rgba(255,255,255,0.1)", borderRadius: "40px", color: "white", cursor: "pointer" }}>Skip</button>
                  <button onClick={applyCrop} style={{ padding: "10px 24px", background: "#10b981", borderRadius: "40px", color: "white", border: "none", cursor: "pointer" }}>Apply</button>
                </div>
              </div>
            )}

            {step === "process" && imagePreview && (
              <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
                <img src={imagePreview} style={{ width: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "12px", marginBottom: "16px" }} />
                <button onClick={resetAll} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", borderRadius: "30px", color: "white", cursor: "pointer", marginBottom: "20px" }}>Change Image</button>
                <button onClick={processOCR} disabled={processing} style={{ width: "100%", padding: "14px", background: "#10b981", borderRadius: "40px", color: "white", border: "none", fontSize: "16px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  {processing ? <><FiLoader className="spinning" /> Processing... {processingProgress}%</> : <><FiImage /> Extract Lyrics</>}
                </button>
                {processing && processingProgress > 0 && (
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden", marginTop: "16px" }}>
                    <div style={{ height: "100%", width: `${processingProgress}%`, background: "linear-gradient(90deg, #8b5cf6, #2563eb)", transition: "width 0.3s" }} />
                  </div>
                )}
              </div>
            )}

            {step === "edit" && (
              <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", marginBottom: "20px", color: "white", display: "flex", justifyContent: "space-between" }}>
                  <span>📝 {getWordCount()} words</span>
                  <button onClick={copyToClipboard} style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "30px", padding: "8px 16px", color: "#a78bfa", cursor: "pointer" }}><FiCopy /> Copy</button>
                </div>
                <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} style={{ width: "100%", padding: "20px", background: "#0a0a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", color: "white", fontSize: "14px", lineHeight: "1.6", fontFamily: "monospace", marginBottom: "20px" }} rows={12} placeholder="Extracted lyrics will appear here..." />
                <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
                  <button onClick={resetAll} style={{ padding: "12px 24px", background: "rgba(255,255,255,0.1)", borderRadius: "40px", color: "white", cursor: "pointer" }}>Start Over</button>
                  <button onClick={saveToHymnBook} style={{ padding: "12px 28px", background: "#2563eb", borderRadius: "40px", color: "white", fontWeight: "600", border: "none", cursor: "pointer" }}>Save to Hymn Book</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Chat Tab - Simple Working */}
        {activeTab === "chat" && (
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", flexDirection: "column", height: "550px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "white", fontWeight: "600" }}>
                <FiMessageSquare size={20} />
                <span>ZUCA AI Chat</span>
              </div>
              <button onClick={clearChat} style={{ width: "32px", height: "32px", borderRadius: "16px", background: "rgba(255,255,255,0.1)", border: "none", color: "white", cursor: "pointer" }}><FiTrash size={16} /></button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {chatMessages.map((msg) => (
                <div key={msg.id} style={{ display: "flex", gap: "12px", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: msg.role === "user" ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                    {msg.role === "user" ? "👤" : "🧠"}
                  </div>
                  <div style={{ maxWidth: "75%", padding: "12px 16px", borderRadius: "18px", background: msg.role === "user" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "6px", textAlign: "right" }}>{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>🧠</div>
                  <div style={{ padding: "12px 16px", borderRadius: "18px", background: "rgba(255,255,255,0.08)", display: "flex", gap: "6px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out" }}></div>
                    <div style={{ width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out", animationDelay: "0.2s" }}></div>
                    <div style={{ width: "8px", height: "8px", borderRadius: "4px", background: "rgba(255,255,255,0.5)", animation: "typing 1.4s infinite ease-in-out", animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div style={{ display: "flex", gap: "12px", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)" }}>
              <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={handleChatKeyPress} placeholder="Type anything... song name, question, or just chat!" style={{ flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", color: "white", fontSize: "14px", resize: "none", fontFamily: "inherit", minHeight: "44px" }} rows={1} />
              <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()} style={{ width: "44px", height: "44px", borderRadius: "22px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", border: "none", color: "white", cursor: "pointer" }}><FiSend size={20} /></button>
            </div>
            
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", marginBottom: "8px" }}>💡 Try:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button onClick={() => setChatInput("Amazing Grace")} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", color: "rgba(255,255,255,0.7)", fontSize: "12px", cursor: "pointer" }}>🎵 Amazing Grace</button>
                <button onClick={() => setChatInput("How are you?")} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", color: "rgba(255,255,255,0.7)", fontSize: "12px", cursor: "pointer" }}>💬 How are you?</button>
                <button onClick={() => setChatInput("Tell me a joke")} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", color: "rgba(255,255,255,0.7)", fontSize: "12px", cursor: "pointer" }}>😂 Tell a joke</button>
                <button onClick={() => setChatInput("What can you do?")} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", color: "rgba(255,255,255,0.7)", fontSize: "12px", cursor: "pointer" }}>❓ Help</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes typing { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-8px); } }
      `}</style>
    </div>
  );
}