# Kuro (黒)

<div align="center">

```
     /$$   /$$ /$$   /$$ /$$$$$$$   /$$$$$$
    | $$  /$$/| $$  | $$| $$__  $$ /$$__  $$
    | $$ /$$/ | $$  | $$| $$  \ $$| $$  \ $$
    | $$$$$/  | $$  | $$| $$$$$$$/| $$  | $$
    | $$  $$  | $$  | $$| $$__  $$| $$  | $$
    | $$\  $$ | $$  | $$| $$  \ $$| $$  | $$
    | $$ \  $$|  $$$$$$/| $$  | $$|  $$$$$$/
    |__/  \__/ \______/ |__/  |__/ \______/
```

**Background HTTP Cron Scheduler**

Lightweight • Fast • Easy to Use • Cross-Platform

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Examples](#examples)

</div>

---

## Features

✨ **Easy to Use**
- Beautiful interactive CLI interface
- Paste curl commands directly - no manual configuration needed
- Intuitive task management with visual feedback

⚡ **Lightweight & Fast**
- Built with Bun for maximum performance
- SQLite for minimal resource usage (~50MB RAM)
- Single binary - no external dependencies

🔒 **Full Auth Support**
- Bearer tokens
- Basic authentication
- API keys
- Custom authorization headers

📊 **Powerful Monitoring**
- Real-time task execution logs
- Success/failure statistics
- Error tracking and storage
- Health monitoring

🔄 **Reliable Execution**
- Automatic retry with exponential backoff
- Configurable timeouts
- Cron expression validation
- Background daemon mode

🌐 **Cross-Platform**
- Linux (x64, ARM64)
- macOS (x64, Apple Silicon)
- Windows (x64)

---

## Installation

### One-Line Install

**Linux / macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/ilhamjaya08/kuro/refs/heads/master/install/install.sh | bash
```

**Windows (PowerShell as Admin):**
```powershell
irm https://raw.githubusercontent.com/ilhamjaya08/kuro/refs/heads/master/install/install.ps1 | iex
```

### Manual Installation

1. Download the binary for your platform from [Releases](https://github.com/ilhamjaya08/kuro/releases)
2. Extract and move to your PATH:

```bash
# Linux/macOS
chmod +x kuro-linux-x64
sudo mv kuro-linux-x64 /usr/local/bin/kuro

# Windows
move kuro-windows-x64.exe C:\Program Files\Kuro\kuro.exe
```

3. (Optional) Install as a system service:

```bash
# Linux with systemd
sudo cp install/kuro.service /etc/systemd/system/
sudo systemctl enable kuro
sudo systemctl start kuro

# macOS with launchd
cp install/com.kuro.daemon.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.kuro.daemon.plist
```

---

## Usage

### Quick Start

1. **Launch Kuro:**
   ```bash
   kuro
   ```

2. **Create your first task:**
   - Select "Create new task"
   - Choose a schedule (presets or custom cron expression)
   - Paste your curl command or configure manually
   - Done! Your task will run in the background

3. **Manage tasks:**
   - View all tasks with real-time status
   - Start/stop individual tasks
   - Edit configurations
   - View execution logs

### CLI Commands

```bash
kuro              # Launch interactive menu
kuro --daemon     # Run as background daemon (auto-started by service)
```

---

## Examples

### Example 1: Health Check Every 5 Minutes

**Curl command:**
```bash
curl -X GET https://api.example.com/health
```

**In Kuro:**
1. Create new task
2. Name: "API Health Check"
3. Schedule: "Every 5 minutes"
4. Paste the curl command above
5. ✓ Task created and running!

---

### Example 2: POST with Bearer Auth

**Curl command:**
```bash
curl -X POST https://api.example.com/webhook \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{"event": "daily_report", "timestamp": "2024-01-01"}'
```

**In Kuro:**
1. Create new task
2. Name: "Daily Report Webhook"
3. Schedule: "Daily at midnight"
4. Paste the curl command
5. Kuro automatically detects:
   - Method: POST
   - Auth: Bearer token (masked in UI)
   - Headers: Content-Type
   - Body: JSON payload

---

### Example 3: API Key Authentication

**Curl command:**
```bash
curl -X GET https://api.service.com/data \
  -H "X-API-Key: your-api-key-12345"
```

**In Kuro:**
- Kuro detects API key authentication automatically
- Stores securely in SQLite
- Shows masked value in UI: `****12345`

---

### Example 4: Custom Schedule

**Cron expression:** `0 */6 * * *` (Every 6 hours)

Create tasks with any valid cron expression:
- `* * * * *` - Every minute
- `*/15 * * * *` - Every 15 minutes
- `0 9 * * 1-5` - Weekdays at 9 AM
- `0 0 1 * *` - First day of every month

---

## Task Management

### Create Task
- **From curl:** Just paste your curl command
- **Manual:** Step-by-step configuration
- **Presets:** Choose from common schedules

### Manage Tasks
- **View all tasks** with status indicators
- **Start/Stop** individual tasks
- **Edit** task configuration
- **Run now** for manual execution
- **Delete** tasks (with confirmation)

### View Logs
- **All logs:** See complete execution history
- **Errors only:** Filter failed executions
- **By task:** View logs for specific task
- Auto-cleanup after 30 days (configurable)

### Daemon Control
- **Start/Stop** background daemon
- **View status:** PID, uptime, running tasks
- **Restart:** Quick daemon restart

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Interactive CLI Menu            │
│     (Beautiful @clack/prompts UI)       │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│        Background Daemon                 │
│  • Cron Scheduler (cron-parser)         │
│  • Task Executor (fetch API)            │
│  • SQLite Database (better-sqlite3)     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│         HTTP Executor                    │
│  • GET/POST/PUT/DELETE/PATCH            │
│  • Auth: Bearer/Basic/API Key/Custom    │
│  • Auto-retry with exponential backoff  │
│  • Timeout handling                      │
└──────────────────────────────────────────┘
```

---

## Configuration

### Data Storage

Kuro stores all data in platform-specific directories:

- **Linux:** `~/.kuro/`
- **macOS:** `~/Library/Application Support/Kuro/`
- **Windows:** `%APPDATA%\Kuro\`

### Database Schema

- **tasks:** Task configurations and schedules
- **logs:** Execution history (auto-cleanup)
- **daemon_state:** Daemon status tracking
- **settings:** User preferences

### Default Settings

- Log retention: 30 days
- Default timeout: 30 seconds
- Default retry count: 3
- Max concurrent tasks: 10

---

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0

### Setup

```bash
# Clone repository
git clone https://github.com/ilhamjaya08/kuro.git
cd kuro

# Install dependencies
bun install

# Run in development mode
bun run dev
```

### Build

```bash
# Build for current platform
bun run build

# Build for all platforms
bun run build:all
```

Binaries will be in `dist/` directory.

### Project Structure

```
kuro/
├── src/
│   ├── cli/              # Interactive CLI interface
│   │   ├── menu.ts       # Main menu system
│   │   ├── prompts.ts    # User prompts
│   │   └── ascii.ts      # Logo and styling
│   ├── core/             # Core functionality
│   │   ├── scheduler.ts  # Cron scheduler
│   │   ├── executor.ts   # HTTP executor
│   │   └── daemon.ts     # Daemon manager
│   ├── db/               # Database layer
│   │   ├── index.ts      # SQLite setup
│   │   └── models.ts     # Data models
│   ├── utils/            # Utilities
│   │   ├── curl-parser.ts     # Curl command parser
│   │   └── cron-validator.ts  # Cron validation
│   └── index.ts          # Entry point
├── install/              # Installation scripts
│   ├── install.sh        # Linux/macOS installer
│   ├── install.ps1       # Windows installer
│   └── kuro.service      # systemd service
└── scripts/
    └── build-all.ts      # Multi-platform build
```

---

## FAQ

**Q: Do I need Bun installed to use Kuro?**
A: No! The installation provides a standalone binary with no dependencies.

**Q: Can I use Kuro without the daemon?**
A: Yes, but tasks won't execute automatically. The daemon is required for scheduled execution.

**Q: How do I update Kuro?**
A: Re-run the installation script. It will download the latest version.

**Q: Where are my tasks stored?**
A: In an SQLite database in your platform's data directory (see [Configuration](#configuration)).

**Q: Can I import/export tasks?**
A: Not yet, but it's planned for a future release!

**Q: What happens if my VPS restarts?**
A: The daemon auto-starts on boot (when installed as a service).

**Q: Can I run multiple instances?**
A: Currently no. The daemon uses a PID file to prevent multiple instances.

---

## Troubleshooting

### Daemon won't start

```bash
# Check daemon status
kuro
# Select "Daemon control" → "Show status"

# Check logs (Linux)
journalctl -u kuro -f

# Check PID file
cat ~/.kuro/kuro.pid
```

### Task not executing

1. Verify daemon is running
2. Check task status (should be "running")
3. View task logs for errors
4. Verify cron expression is valid

### Installation failed

- Ensure you have write permissions
- On Linux/macOS, try with `sudo`
- On Windows, run PowerShell as Administrator

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Credits

Built with:
- [Bun](https://bun.sh) - Fast JavaScript runtime (with native SQLite)
- [@clack/prompts](https://github.com/natemoo-re/clack) - Beautiful CLI prompts
- [cron-parser](https://github.com/harrisiirak/cron-parser) - Cron expression parser
- [curlconverter](https://github.com/curlconverter/curlconverter) - Curl command parser

---

<div align="center">

Made with ❤️ by the Kuro contributors

[⭐ Star on GitHub](https://github.com/ilhamjaya08/kuro) • [🐛 Report Bug](https://github.com/ilhamjaya08/kuro/issues) • [💡 Request Feature](https://github.com/ilhamjaya08/kuro/issues)

</div>
