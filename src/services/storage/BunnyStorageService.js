import axios from "axios";
import config from "../../config/config.js";
import path from "path";

class BunnyStorageService {
  constructor() {
    this.apiKey = config.bunny.apiKey;
    this.storageZone = config.bunny.storageZoneName;
    this.region = config.bunny.storageRegion;
    this.pullZone = config.bunny.pullZoneUrl;
    this.baseFolder = config.bunny.folder;

    // Determine base URL based on region
    // The main endpoint is storage.bunnycdn.com
    // Regions like DE, NY, SG have specific endpoints if not using main.
    // Actually, Bunny uses: https://{region-code}.storage.bunnycdn.com
    // But 'ny' might just be the default cluster.
    // Standard endpoint: https://storage.bunnycdn.com
    // If region is specified and not 'ny' (default), we prefix.
    
    // For simplicity, let's assume default endpoint unless region provided in specific format
    // Documentation says:
    // Falkenstein (DE): https://storage.bunnycdn.com
    // New York (US): https://ny.storage.bunnycdn.com
    // Los Angeles (US): https://la.storage.bunnycdn.com
    // Singapore (SG): https://sg.storage.bunnycdn.com
    // Sydney (AU): https://syd.storage.bunnycdn.com
    // London (UK): https://uk.storage.bunnycdn.com
    
    this.baseUrl = "https://storage.bunnycdn.com";
    if (this.region && this.region !== "de") { // 'de' uses main endpoint
        this.baseUrl = `https://${this.region}.storage.bunnycdn.com`;
    }
  }

  /**
   * Upload file to Bunny.net
   * @param {Buffer} buffer - File content
   * @param {string} filename - Target filename
   * @param {string} subfolder - Subfolder (e.g. 'images', 'videos')
   * @returns {Promise<string>} - Public URL of the file
   */
  async uploadFile(buffer, filename, subfolder = "") {
    if (!this.apiKey || !this.storageZone) {
      console.warn("Bunny.net configuration missing, skipping upload");
      return null;
    }

    try {
      const targetPath = path.posix.join(this.baseFolder, subfolder, filename);
      const url = `${this.baseUrl}/${this.storageZone}/${targetPath}`;

      console.log(`[BUNNY] Uploading file to ${url}`);

      await axios.put(url, buffer, {
        headers: {
          AccessKey: this.apiKey,
          "Content-Type": "application/octet-stream", // Bunny detects type usually, or we pass it
        },
      });

      // Construct public URL
      let publicUrl = "";
      if (this.pullZone) {
        publicUrl = new URL(targetPath, this.pullZone).toString();
      } else {
        // Fallback or setup needed
        // If no pull zone, we can't really access it publicly easily without raw link if allowed
        console.warn("[BUNNY] No Pull Zone URL configured. Saving storage path.");
        publicUrl = `[STORAGE]/${targetPath}`;
      }

      console.log(`[BUNNY] Upload successful: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      console.error("[BUNNY] Upload failed:", error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Delete file from Bunny.net
   */
  async deleteFile(filename, subfolder = "") {
     if (!this.apiKey || !this.storageZone) return false;
     try {
       const targetPath = path.posix.join(this.baseFolder, subfolder, filename);
       const url = `${this.baseUrl}/${this.storageZone}/${targetPath}`;
       
       await axios.delete(url, {
         headers: { AccessKey: this.apiKey }
       });
       return true;
     } catch (error) {
       console.error("[BUNNY] Delete failed:", error.message);
       return false;
     }
  }
}

export default new BunnyStorageService();
