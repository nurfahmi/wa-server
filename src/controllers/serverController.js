import os from "os";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

// Get server statistics
export const getServerStats = async (req, res) => {
  try {
    // CPU usage calculation
    const cpuUsage = await getCPUUsage();

    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // System uptime
    const uptime = os.uptime();

    // Get disk usage
    const diskUsage = await getDiskUsage();

    // Load average (Unix systems)
    const loadAverage = os.loadavg();

    // Platform info
    const platform = {
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
    };

    // Node.js process stats
    const processStats = {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };

    res.json({
      timestamp: new Date().toISOString(),
      cpu: {
        usage: cpuUsage,
        loadAverage: loadAverage,
        cores: os.cpus().length,
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usagePercent: memoryUsagePercent,
        formatted: {
          total: formatBytes(totalMemory),
          free: formatBytes(freeMemory),
          used: formatBytes(usedMemory),
        },
      },
      disk: diskUsage,
      uptime: {
        system: uptime,
        process: process.uptime(),
        formatted: {
          system: formatUptime(uptime),
          process: formatUptime(process.uptime()),
        },
      },
      platform,
      process: {
        ...processStats,
        memory: {
          ...processStats.memory,
          formatted: {
            rss: formatBytes(processStats.memory.rss),
            heapUsed: formatBytes(processStats.memory.heapUsed),
            heapTotal: formatBytes(processStats.memory.heapTotal),
            external: formatBytes(processStats.memory.external),
          },
        },
      },
    });
  } catch (error) {
    console.error("Error getting server stats:", error);
    res.status(500).json({ error: "Failed to get server statistics" });
  }
};

// Calculate CPU usage percentage
function getCPUUsage() {
  return new Promise((resolve) => {
    const startMeasure = process.cpuUsage();
    const startTime = process.hrtime();

    setTimeout(() => {
      const endMeasure = process.cpuUsage(startMeasure);
      const endTime = process.hrtime(startTime);

      const totalTime = endTime[0] * 1e6 + endTime[1] / 1e3; // Convert to microseconds
      const cpuTime = endMeasure.user + endMeasure.system;
      const cpuPercent = (cpuTime / totalTime) * 100;

      resolve(Math.min(100, Math.max(0, cpuPercent))); // Clamp between 0-100
    }, 100);
  });
}

// Get disk usage for the current directory
async function getDiskUsage() {
  try {
    const stats = await fs.stat(process.cwd());

    // For Unix-like systems, try to get disk space
    if (process.platform !== "win32") {
      try {
        const output = execSync("df -h .", { encoding: "utf8" });
        const lines = output.trim().split("\n");

        if (lines.length > 1) {
          const diskInfo = lines[1].split(/\s+/);
          const total = diskInfo[1];
          const used = diskInfo[2];
          const available = diskInfo[3];
          const usagePercent = parseFloat(diskInfo[4]);

          return {
            total,
            used,
            available,
            usagePercent,
            filesystem: diskInfo[0],
            mountPoint: diskInfo[5] || "/",
          };
        }
      } catch (execError) {
        console.warn("Could not get disk usage via df command");
      }
    }

    // Fallback - return basic info
    return {
      total: "N/A",
      used: "N/A",
      available: "N/A",
      usagePercent: 0,
      filesystem: "Unknown",
      mountPoint: process.cwd(),
    };
  } catch (error) {
    console.warn("Could not get disk usage:", error.message);
    return {
      total: "N/A",
      used: "N/A",
      available: "N/A",
      usagePercent: 0,
      filesystem: "Unknown",
      mountPoint: "N/A",
    };
  }
}

// Format bytes to human readable format
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Format uptime to human readable format
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}
