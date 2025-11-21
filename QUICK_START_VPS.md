# 🚀 Kuro - VPS Quick Start (5 Minutes)

## Step 1: Create Your Tasks (Interactive Mode)

```bash
# Start interactive CLI
bun run src/index.ts
# or if installed: kuro

# In the menu:
# 1. Select "Create new task"
# 2. Create your tasks (HTTP requests with schedules)
# 3. Exit with Ctrl+C when done
```

**Important:** Tasks are SAVED in database. You only need to create them once!

---

## Step 2: Start Background Daemon

### Option A: Using Helper Script (Easiest)
```bash
./start-daemon.sh
```

### Option B: Manual
```bash
nohup bun run src/index.ts --daemon > ~/.kuro/logs/daemon.log 2>&1 &
```

### Option C: If installed as binary
```bash
nohup kuro --daemon > ~/.kuro/logs/daemon.log 2>&1 &
```

---

## Step 3: Verify It's Running

```bash
./status-daemon.sh

# Or manually:
ps aux | grep "daemon"
```

You should see:
```
✅ Status: RUNNING
   PID: 12345
   Uptime: 00:05:23
   Memory: 45 MB
```

---

## Step 4: Monitor Execution

```bash
# View real-time logs
tail -f ~/.kuro/logs/daemon.log

# Or check in CLI (daemon keeps running)
bun run src/index.ts
# Select: View logs
```

---

## Common Commands

```bash
# Start daemon
./start-daemon.sh

# Stop daemon
./stop-daemon.sh

# Check status
./status-daemon.sh

# View logs
tail -f ~/.kuro/logs/daemon.log

# Create/manage tasks (daemon keeps running in background)
bun run src/index.ts
```

---

## 🔥 Important Understanding

### Two Separate Modes:

1. **Interactive CLI** (`bun run src/index.ts`)
   - For managing tasks
   - Scheduler runs IN-PROCESS
   - If you Ctrl+C, scheduler STOPS

2. **Daemon Mode** (`bun run src/index.ts --daemon`)
   - For background execution
   - No menu, pure execution
   - Runs forever until you kill it

### Workflow:

```
┌─────────────────┐     ┌─────────────────┐
│  Interactive    │     │   Daemon Mode   │
│  CLI Mode       │     │  (Background)   │
├─────────────────┤     ├─────────────────┤
│ - Create tasks  │     │ - Execute tasks │
│ - Edit tasks    │     │ - Run 24/7      │
│ - View logs     │     │ - Auto-schedule │
│ - Manage        │     │ - No UI         │
└─────────────────┘     └─────────────────┘
        │                       │
        └───────┬───────────────┘
                │
        ┌───────▼────────┐
        │  SQLite DB     │
        │  (~/.kuro/)    │
        └────────────────┘
```

---

## Example: Complete Setup

```bash
# 1. Create task
$ bun run src/index.ts
┌ What would you like to do?
│ ● Create new task

┌ Create New Task
│ Name: Health Check
│ Schedule: */5 * * * * (every 5 minutes)
│ URL: https://api.example.com/health

✔ Task created!

# Exit CLI (Ctrl+C)

# 2. Start daemon
$ ./start-daemon.sh
🚀 Starting Kuro daemon...
✅ Daemon started successfully!
   PID: 12345

# 3. Verify
$ ./status-daemon.sh
✅ Status: RUNNING
   Tasks: 1 total, 1 running
   Logs: 0 entries

# 4. Wait 5 minutes, check again
$ ./status-daemon.sh
✅ Status: RUNNING
   Tasks: 1 total, 1 running
   Logs: 1 entries (success!)

# 5. View logs
$ tail -f ~/.kuro/logs/daemon.log
Running task: Health Check (GET https://api.example.com/health)
Task completed: success (124ms)
```

---

## Troubleshooting

### "Task not executing"

1. Check daemon is running:
   ```bash
   ./status-daemon.sh
   ```

2. Check task is set to "running":
   ```bash
   bun run src/index.ts
   # Go to: Manage tasks → check status
   ```

3. Check next_run time hasn't passed

### "Daemon stops after I close terminal"

Use `nohup` or helper scripts:
```bash
./start-daemon.sh  # Already includes nohup
```

Or use `screen`/`tmux`:
```bash
screen -S kuro
bun run src/index.ts --daemon
# Ctrl+A, D to detach
```

### "Can't create tasks - database locked"

Stop daemon first:
```bash
./stop-daemon.sh
```

Then create tasks, then restart daemon.

---

## Production Setup (systemd)

For serious production use:

```bash
# 1. Copy service file
sudo cp install/kuro.service /etc/systemd/system/

# 2. Edit paths in service file
sudo nano /etc/systemd/system/kuro.service

# 3. Enable & start
sudo systemctl enable kuro
sudo systemctl start kuro

# 4. Check status
sudo systemctl status kuro

# 5. View logs
sudo journalctl -u kuro -f
```

---

## TL;DR

```bash
# Create tasks (once)
bun run src/index.ts
# (create tasks, exit)

# Run forever
./start-daemon.sh

# Check status anytime
./status-daemon.sh

# Stop when needed
./stop-daemon.sh
```

**That's it!** Your tasks run 24/7 in background. 🎉
