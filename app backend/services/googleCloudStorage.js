const { Storage } = require('@google-cloud/storage');

class GoogleCloudStorageService {
  constructor() {
    // Initialize Google Cloud Storage
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Path to your service account key file
    });
    
    this.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'smart-garden-images';
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Upload base64 image to Google Cloud Storage
   * @param {string} base64Image - Base64 encoded image data
   * @param {string} fileName - Name for the file (e.g., 'plant_123.jpg')
   * @returns {Promise<string>} - Public URL of the uploaded image
   */
  async uploadBase64Image(base64Image, fileName) {
    try {
      // Remove data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Create file reference
      const file = this.bucket.file(fileName);
      
      // Upload the file
      await file.save(imageBuffer, {
        metadata: {
          contentType: this.getContentType(fileName),
        },
        public: true, // Make the file publicly accessible
      });
      
      // Generate public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
      
      console.log(`Image uploaded successfully: ${publicUrl}`);
      return publicUrl;
      
    } catch (error) {
      console.error('Error uploading image to Google Cloud Storage:', error);
      throw new Error('Failed to upload image to cloud storage');
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
}

module.exports = new GoogleCloudStorageService(); 