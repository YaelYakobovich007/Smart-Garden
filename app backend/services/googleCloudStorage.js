/**
 * Google Cloud Storage Service
 *
 * Handles base64 image uploads to a GCS bucket and signed URL generation for
 * read access. Uses service account locally and default credentials on Cloud Run.
 */
const { Storage } = require('@google-cloud/storage');

class GoogleCloudStorageService {
  constructor() {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      console.log('[STORAGE] Error: Missing GOOGLE_CLOUD_PROJECT_ID environment variable');
    }
    if (!process.env.GOOGLE_CLOUD_KEY_FILE && !process.env.K_SERVICE) {
      console.log('[STORAGE] Error: Missing GOOGLE_CLOUD_KEY_FILE environment variable (required for local development)');
    }
    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      console.log('[STORAGE] Error: Missing GOOGLE_CLOUD_BUCKET_NAME environment variable');
    }

    // Initialize Google Cloud Storage
    try {
      // Use default service account in Cloud Run, or keyFile locally
      const storageConfig = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      };

      // Only use keyFilename if running locally (not in Cloud Run)
      if (process.env.GOOGLE_CLOUD_KEY_FILE && !process.env.K_SERVICE) {
        storageConfig.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
      }

      this.storage = new Storage(storageConfig);

      this.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
      this.bucket = this.storage.bucket(this.bucketName);

      console.log(`[STORAGE] Initialized: project=${process.env.GOOGLE_CLOUD_PROJECT_ID} bucket=${this.bucketName} key=${process.env.GOOGLE_CLOUD_KEY_FILE || 'default'}`);
    } catch (error) {
      console.log(`[STORAGE] Error: Failed to initialize - ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload base64 image to Google Cloud Storage
   * @param {string} base64Image - Base64 encoded image data
   * @param {string} fileName - Name for the file (e.g., 'plant_123.jpg')
   * @returns {Promise<string>} - Public URL of the uploaded image
   */
  async uploadBase64Image(base64Image, fileName) {
    try {
      console.log(`[STORAGE] Starting upload: file=${fileName}`);

      // Validate inputs
      if (!base64Image) {
        throw new Error('Base64 image data is required');
      }
      if (!fileName) {
        throw new Error('File name is required');
      }

      // Remove data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      console.log(`[STORAGE] Image buffer: size=${imageBuffer.length}bytes`);

      // Create file reference
      const file = this.bucket.file(fileName);

      // Upload the file (removed public: true due to public access prevention)
      console.log(`[STORAGE] Uploading to bucket: ${this.bucketName}`);
      await file.save(imageBuffer, {
        metadata: {
          contentType: this.getContentType(fileName),
        },
        // Removed public: true - bucket has public access prevention enabled
      });

      // Generate signed URL for public access (valid for 1 year)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year from now
      });

      console.log(`[STORAGE] Upload complete: file=${fileName} url=${signedUrl}`);
      return signedUrl;

    } catch (error) {
      console.log(`[STORAGE] Error: Upload failed - file=${fileName} message=${error.message} code=${error.code} status=${error.status}`);
      throw new Error(`Failed to upload image to cloud storage: ${error.message}`);
    }
  }

  /**
   * Delete image from Google Cloud Storage
   * @param {string} fileName - Name of the file to delete
   */
  async deleteImage(fileName) {
    try {
      const file = this.bucket.file(fileName);
      await file.delete();
      console.log(`[STORAGE] Deleted: file=${fileName}`);
    } catch (error) {
      console.log(`[STORAGE] Error: Failed to delete - file=${fileName} error=${error.message}`);
      throw new Error('Failed to delete image from cloud storage');
    }
  }

  /**
   * Generate unique filename for plant image
   * @param {string} plantId - Plant ID
   * @param {string} originalName - Original filename or extension
   * @returns {string} - Unique filename
   */
  generateFileName(plantId, originalName = 'jpg') {
    const timestamp = Date.now();
    const extension = originalName.includes('.') ? originalName.split('.').pop() : originalName;
    return `plants/plant_${plantId}_${timestamp}.${extension}`;
  }

  /**
   * Get content type based on file extension
   * @param {string} fileName - Filename
   * @returns {string} - MIME type
   */
  getContentType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return contentTypes[extension] || 'image/jpeg';
  }

  /**
   * Test Google Cloud Storage connection and bucket access
   */
  async testConnection() {
    try {
      console.log('[STORAGE] Testing connection...');

      // Test bucket access
      const [exists] = await this.bucket.exists();
      if (!exists) {
        throw new Error(`Bucket '${this.bucketName}' does not exist`);
      }

      console.log(`[STORAGE] Connection test successful: bucket=${this.bucketName}`);
      return true;
    } catch (error) {
      console.log(`[STORAGE] Error: Connection test failed - ${error.message}`);
      throw error;
    }
  }
}

module.exports = new GoogleCloudStorageService(); 