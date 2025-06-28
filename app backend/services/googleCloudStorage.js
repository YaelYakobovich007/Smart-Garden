const { Storage } = require('@google-cloud/storage');

class GoogleCloudStorageService {
  constructor() {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
      console.error('❌ GOOGLE_CLOUD_PROJECT_ID environment variable is not set');
    }
    if (!process.env.GOOGLE_CLOUD_KEY_FILE) {
      console.error('❌ GOOGLE_CLOUD_KEY_FILE environment variable is not set');
    }
    if (!process.env.GOOGLE_CLOUD_BUCKET_NAME) {
      console.error('❌ GOOGLE_CLOUD_BUCKET_NAME environment variable is not set');
    }

    // Initialize Google Cloud Storage
    try {
      this.storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Path to your service account key file
      });
      
      this.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
      this.bucket = this.storage.bucket(this.bucketName);
      
      console.log('✅ Google Cloud Storage initialized with:');
      console.log(`   Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
      console.log(`   Bucket: ${this.bucketName}`);
      console.log(`   Key file: ${process.env.GOOGLE_CLOUD_KEY_FILE}`);
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud Storage:', error);
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
      console.log(`📤 Starting upload for file: ${fileName}`);
      
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
      console.log(`📊 Image buffer size: ${imageBuffer.length} bytes`);
      
      // Create file reference
      const file = this.bucket.file(fileName);
      
      // Upload the file (removed public: true due to public access prevention)
      console.log(`🚀 Uploading to bucket: ${this.bucketName}`);
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
      
      console.log(`✅ Image uploaded successfully with signed URL`);
      return signedUrl;
      
    } catch (error) {
      console.error('❌ Error uploading image to Google Cloud Storage:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details
      });
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
      console.log(`Image deleted successfully: ${fileName}`);
    } catch (error) {
      console.error('Error deleting image from Google Cloud Storage:', error);
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
      console.log('🧪 Testing Google Cloud Storage connection...');
      
      // Test bucket access
      const [exists] = await this.bucket.exists();
      if (!exists) {
        throw new Error(`Bucket '${this.bucketName}' does not exist`);
      }
      
      console.log('✅ Google Cloud Storage connection test successful');
      console.log(`✅ Bucket '${this.bucketName}' is accessible`);
      return true;
    } catch (error) {
      console.error('❌ Google Cloud Storage connection test failed:', error);
      throw error;
    }
  }
}

module.exports = new GoogleCloudStorageService(); 