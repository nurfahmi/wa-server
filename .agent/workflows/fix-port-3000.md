---
description: Fix port 3000 still running after crash or Ctrl+C
---

# Fix Port 3000 Still Running

When port 3000 is still running after you cancel with Ctrl+C or the program crashes, follow these steps:

## Quick Fix

### Option 1: Use npm script
```bash
npm run kill:3000
```

### Option 2: Use shell script directly
```bash
./kill-port.sh 3000
```

### Option 3: Kill any port
```bash
./kill-port.sh [port_number]
# Example: ./kill-port.sh 8080
```

## Start Development Server Safely

To automatically clean up port 3000 before starting the dev server:

// turbo
```bash
npm run dev:safe
```

## Manual Approach

If the scripts don't work, you can manually kill processes:

1. Find the process using the port:
```bash
lsof -i :3000
```

2. Kill the process by PID:
```bash
kill -9 [PID]
```

Or kill all processes on the port:
```bash
lsof -i :3000 -t | xargs kill -9
```

## Prevention

To prevent this issue in the future:
- Always use `npm run dev:safe` instead of `npm run dev`
- If you need to stop the server, use Ctrl+C and wait for it to shut down gracefully
- If the port gets stuck, use `npm run kill:3000` before restarting

## Troubleshooting

If port 3000 is still stuck after using the scripts:

1. Check if multiple node processes are running:
```bash
ps aux | grep node
```

2. Kill all node processes (use with caution):
```bash
pkill -9 node
```

3. Restart your terminal and try again
