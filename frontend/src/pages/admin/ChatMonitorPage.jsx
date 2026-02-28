import backgroundImg from "../../assets/background.png";

function ChatMonitorPage() {
  return (
    <div style={pageStyle}>
      <h1>Chat Monitor</h1>
      <p>Monitor user chats and see who is online in real-time.</p>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: `url(${backgroundImg}) no-repeat center center`,
  backgroundSize: "cover",
  color: "white",
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

export default ChatMonitorPage;