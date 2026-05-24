const io = require('socket.io-client');
const readline = require('readline');

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let userId = null;
let conversationId = null;

// Colors for console
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

socket.on('connect', () => {
  console.log(`${colors.green}✅ Connected to Socket.io server${colors.reset}`);
  console.log(`${colors.yellow}Socket ID:${colors.reset}`, socket.id);
  
  rl.question(`${colors.blue}Enter your userId: ${colors.reset}`, (answer) => {
    userId = answer;
    socket.emit('dm:join', userId);
    console.log(`${colors.green}📡 Joined as user: ${userId}${colors.reset}`);
    
    rl.question(`${colors.blue}Enter conversationId: ${colors.reset}`, (convId) => {
      if (convId) conversationId = convId;
      console.log(`\n${colors.yellow}🎮 Ready! Commands:${colors.reset}`);
      console.log('  /msg <message> - Send message');
      console.log('  /type - Start typing');
      console.log('  /stop - Stop typing');
      console.log('  /exit - Quit');
      console.log('');
      rl.prompt();
    });
  });
});

socket.on('dm:new_message', (data) => {
  console.log(`\n${colors.green}📨 [NEW] ${data.sender.fullName}: ${data.content}${colors.reset}`);
  rl.prompt();
});

socket.on('dm:message_sent', (data) => {
  console.log(`${colors.green}✅ Message sent! ID: ${data.id}${colors.reset}`);
  rl.prompt();
});

socket.on('dm:typing_start', (data) => {
  console.log(`${colors.yellow}✏️ ${data.userId} is typing...${colors.reset}`);
  rl.prompt();
});

socket.on('dm:typing_stop', (data) => {
  console.log(`${colors.yellow}✏️ ${data.userId} stopped typing${colors.reset}`);
  rl.prompt();
});

socket.on('dm:user_online', (data) => {
  console.log(`${colors.green}🟢 User ${data.userId} came online${colors.reset}`);
  rl.prompt();
});

socket.on('dm:user_offline', (data) => {
  console.log(`${colors.red}🔴 User ${data.userId} went offline${colors.reset}`);
  rl.prompt();
});

socket.on('dm:error', (data) => {
  console.log(`${colors.red}❌ Error: ${data.error}${colors.reset}`);
  rl.prompt();
});

rl.on('line', (input) => {
  if (input === '/exit') {
    console.log('👋 Goodbye!');
    socket.disconnect();
    rl.close();
    process.exit();
  } else if (input === '/type') {
    if (conversationId) {
      socket.emit('dm:typing_start', { conversationId });
      console.log('✏️ Typing indicator sent');
    } else {
      console.log('❌ No conversationId set');
    }
  } else if (input === '/stop') {
    if (conversationId) {
      socket.emit('dm:typing_stop', { conversationId });
      console.log('✏️ Typing stopped');
    } else {
      console.log('❌ No conversationId set');
    }
  } else if (input.startsWith('/msg ')) {
    const message = input.substring(5);
    if (conversationId) {
      socket.emit('dm:send_message', {
        conversationId: conversationId,
        content: message,
        files: [],
        tempId: Date.now().toString()
      });
      console.log(`📤 Sending: ${message}`);
    } else {
      console.log('❌ No conversationId set');
    }
  } else if (input.trim() !== '') {
    console.log('Unknown command. Use /msg <message>, /type, /stop, or /exit');
  }
  rl.prompt();
});

socket.on('disconnect', () => {
  console.log(`${colors.red}❌ Disconnected from server${colors.reset}`);
});

rl.on('close', () => {
  process.exit();
});
