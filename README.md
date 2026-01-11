# German Watchdog

A surveillance monitoring system that detects user distractions and sends Discord notifications.

## Features

- **Camera Monitoring**: Continuously monitors webcam for phone detection and sleep detection
- **Screen Recording Detection**: Detects screen sharing/streams
- **Process Monitoring**: Monitors running processes for suspicious applications
- **Activity Tracking**: Detects user inactivity
- **Discord Notifications**: Sends alerts via webhooks when distraction is detected
- **Video Integration**: Uses `source.mp4` for surveillance simulation

## Requirements

- macOS / Windows / Linux
- Camera and microphone permissions
- Node.js 18+ or Bun runtime

## Installation

```bash
# Install dependencies
bun install

# Or using npm
npm install
```

## Running the Application

```bash
# Start the Electron application
bun start

# Or run in development mode
npm run dev
```

## Project Structure

```
german-watchdog/
├── main.js           # Electron main process
├── preload.js        # Preload script for secure IPC
├── index.html        # Main application UI
├── styles.css        # Application styles
├── renderer.js       # Main application logic
├── source.mp4        # Surveillance video (12 seconds)
├── package.json      # Project configuration
└── node_modules/     # Dependencies
```

## Usage

### Starting Surveillance

1. Click "Request Permissions" to grant camera and screen recording access
2. Click "Start Surveillance" to begin monitoring
3. The video will play showing the surveillance simulation
4. Monitoring runs continuously until the video ends or you click "Stop"

### Detection Features

The system monitors for:
- **Phone Detection**: Detects phone-like objects in camera view
- **Sleep Detection**: Detects if user appears to be sleeping
- **Inactivity**: Warns after 30 seconds of no user activity
- **Suspicious Processes**: Flags screen recording or camera bypass tools

### Discord Integration

1. Get your Discord webhook URL from a channel's settings
2. Enter the URL in the webhook input field
3. Click "Save"
4. Alerts will be sent when distraction is detected

### Alert System

When distraction is detected:
- A modal alert appears in the application
- You can "Dismiss" to acknowledge
- Or "Snooze" for 5 minutes to suppress alerts

## Video Timing

The surveillance video (`source.mp4`) follows this timeline:
- **0-1 seconds**: Door opens, surveillance begins
- **1-12 seconds**: Active surveillance period
- **12 seconds**: Door closes, surveillance ends

## Configuration

Modify detection thresholds in `renderer.js`:

```javascript
this.settings = {
  checkInterval: 2000,          // Detection check every 2 seconds
  phoneDetectionThreshold: 0.7, // Phone detection confidence
  sleepDetectionThreshold: 0.6, // Sleep detection confidence
  inactivityThreshold: 30000,   // 30 seconds before warning
  distractionCooldown: 60000    // 1 minute between alerts
};
```

## Development

### Building for Distribution

```bash
# Build for current platform
npm run electron:build

# Build for specific platform
npm run electron:build -- --mac   # macOS
npm run electron:build -- --win   # Windows
npm run electron:build -- --linux # Linux
```

### Debugging

The application includes DevTools for debugging:
- DevTools open automatically in development mode
- Check console for detection logs and errors

## Privacy & Security

- All detection runs locally on your machine
- Camera feed is not transmitted anywhere
- Discord webhooks use HTTPS for secure notifications
- Process data stays on your system

## License

ISC License
