# Kuro - Daemon/Background Mode Guide

## 🎯 TL;DR - For VPS/Server Use

```bash
# Run in background (detached)
nohup bun run src/index.ts --daemon > /dev/null 2>&1 &

# Or if installed via binary
nohup kuro --daemon > /dev/null 2>&1 &

# Check if running
ps aux | grep kuro

# Stop daemon
pkill -f "kuro --daemon"
```

---

## 📖 Understanding Kuro's Two Modes

### Mode 1: Interactive CLI (Default)
```bash
kuro
# or
bun run src/index.ts
```

**What it does:**
- Opens interactive menu
- You can create/manage tasks
- Scheduler runs IN the same process
- **Must keep terminal open**

**Use for:**
- Local development
- Creating/testing tasks
- Viewing logs interactively

### Mode 2: Daemon (Background)
```bash
kuro --daemon
# or
bun run src/index.ts --daemon
```

**What it does:**
- Runs in foreground (no menu)
- Scheduler starts automatically
- Executes all running tasks
- Prints to stdout

**Use for:**
- Production servers
- VPS deployment
- Background execution

---

## 🚀 Production Deployment

### Option 1: Simple Background Process

```bash
# Run in background with nohup
nohup kuro --daemon > ~/kuro.log 2>&1 &

# Save PID for later
echo $! > ~/kuro.pid

# View logs
tail -f ~/kuro.log

# Stop daemon
kill $(cat ~/kuro.pid)
```

### Option 2: Using screen/tmux

```bash
# Using screen
screen -S kuro
kuro --daemon
# Press Ctrl+A then D to detach

# Reattach
screen -r kuro

# Kill
screen -X -S kuro quit
```

```bash
# Using tmux
tmux new -s kuro
kuro --daemon
# Press Ctrl+B then D to detach

# Reattach
tmux attach -t kuro

# Kill
tmux kill-session -t kuro
```

### Option 3: systemd Service (Recommended for Production)

Create service file:
```bash
sudo nano /etc/systemd/system/kuro.service
```

Content:
```ini
[Unit]
Description=Kuro - Background HTTP Cron Scheduler
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME
ExecStart=/usr/local/bin/kuro --daemon
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable kuro
sudo systemctl start kuro
sudo systemctl status kuro

# View logs
sudo journalctl -u kuro -f

# Stop
sudo systemctl stop kuro
```

### Option 4: PM2 (Node.js Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start "kuro --daemon" --name kuro

# Or with Bun
pm2 start --interpreter bun src/index.ts -- --daemon --name kuro

# View status
pm2 status

# View logs
pm2 logs kuro

# Stop
pm2 stop kuro

# Auto-start on boot
pm2 startup
pm2 save
```

---

## 🔧 Complete VPS Setup Example

### Step 1: Install Kuro
```bash
# Install via script
curl -fsSL https://raw.githubusercontent.com/ilhamjaya08/kuro/main/install/install.sh | bash

# Or manual
cd ~
git clone https://github.com/ilhamjaya08/kuro.git
cd kuro
bun install
bun run build
sudo mv dist/kuro /usr/local/bin/
```

### Step 2: Create Tasks (Interactive)
```bash
# Open interactive menu
kuro

# Create your tasks:
# - API health checks
# - Webhook notifications
# - Data syncing
# etc.

# Exit when done (Ctrl+C)
```

### Step 3: Start Daemon
```bash
# Option A: Simple background
nohup kuro --daemon > ~/kuro.log 2>&1 &

# Option B: systemd (recommended)
sudo systemctl start kuro
```

### Step 4: Verify
```bash
# Check process
ps aux | grep kuro

# Check logs (if using nohup)
tail -f ~/kuro.log

# Check logs (if using systemd)
sudo journalctl -u kuro -f

# Check tasks execution
kuro
# Select: View logs
```

---

## 📊 Monitoring

### Check if Daemon is Running
```bash
# Method 1: Check process
ps aux | grep "kuro --daemon"

# Method 2: Check database
sqlite3 ~/.kuro/kuro.db "SELECT * FROM daemon_state"

# Method 3: Check systemd (if using systemd)
systemctl status kuro
```

### View Real-time Logs
```bash
# If using nohup
tail -f ~/kuro.log

# If using systemd
sudo journalctl -u kuro -f

# If using PM2
pm2 logs kuro
```

### Check Task Execution
```bash
# Open CLI (daemon keeps running in background)
kuro

# Select: View logs
# You'll see execution history even while daemon runs separately
```

---

## ⚠️ Important Notes

1. **CLI and Daemon are SEPARATE**
   - You can open CLI while daemon runs
   - They use the same database
   - Changes in CLI apply immediately to daemon

2. **Task Changes**
   - Create task in CLI → daemon picks it up automatically (within 10s)
   - Stop task in CLI → daemon unschedules it
   - Edit task in CLI → daemon reschedules it

3. **Resource Usage**
   - Daemon uses ~50MB RAM
   - Very low CPU when idle
   - Minimal disk I/O

4. **Auto-Restart**
   - Use systemd for auto-restart on crash
   - Or PM2 with `Restart=always`

5. **Multiple Instances**
   - DON'T run multiple daemons
   - Only ONE daemon should run
   - CLI can be opened multiple times (safe)

---

## 🐛 Troubleshooting

### Daemon Won't Start
```bash
# Check if already running
ps aux | grep kuro

# Check logs
tail -n 50 ~/kuro.log

# Check database
ls -la ~/.kuro/

# Try manual start
kuro --daemon
# (look for error messages)
```

### Tasks Not Executing
```bash
# 1. Check daemon is running
ps aux | grep kuro

# 2. Check task is set to "running"
kuro
# Go to: Manage tasks → verify status

# 3. Check logs
kuro
# Go to: View logs → look for errors

# 4. Check next_run time
sqlite3 ~/.kuro/kuro.db "SELECT id, name, next_run, status FROM tasks"
```

### High CPU Usage
```bash
# Check running tasks
kuro
# Count running tasks

# Check for rapid schedule (e.g., every 1 second)
# Consider using every minute minimum: */1 * * * *
```

---

## ✅ Best Practices

1. **Development**: Use interactive CLI
   - Easy to test and debug
   - Can see logs immediately

2. **Production**: Use daemon with systemd
   - Auto-restart on failure
   - Centralized logging
   - Boot-time start

3. **Monitoring**: Set up alerts
   - Check daemon status
   - Monitor failed tasks
   - Watch for errors

4. **Backups**: Backup database
   ```bash
   # Backup tasks
   cp ~/.kuro/kuro.db ~/.kuro/kuro.db.backup

   # Or export
   sqlite3 ~/.kuro/kuro.db .dump > kuro-backup.sql
   ```

---

## 🎉 Summary

**For Local Use:**
```bash
kuro  # Interactive menu, scheduler runs in-process
```

**For VPS/Server:**
```bash
# Setup once
kuro  # Create tasks interactively

# Run forever
sudo systemctl start kuro  # or nohup kuro --daemon &
```

**That's it!** Tasks will execute automatically in background. 🚀
