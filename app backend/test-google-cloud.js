require('dotenv').config();
const googleCloudStorage = require('./services/googleCloudStorage');

async function testGoogleCloudStorage() {
  try {
    console.log('🧪 Testing Google Cloud Storage Setup...\n');
    
    // Test connection
    await googleCloudStorage.testConnection();
    
    console.log('\n✅ All tests passed! Google Cloud Storage is properly configured.');
    console.log('\n📋 Configuration Summary:');
    console.log(`   Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || 'NOT SET'}`);
    console.log(`   Bucket Name: ${process.env.GOOGLE_CLOUD_BUCKET_NAME || 'NOT SET'}`);
    console.log(`   Key File: ${process.env.GOOGLE_CLOUD_KEY_FILE || 'NOT SET'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure your .env file has the correct values:');
    console.log('   GOOGLE_CLOUD_PROJECT_ID=your-project-id');
    console.log('   GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name');
    console.log('   GOOGLE_CLOUD_KEY_FILE=./config/service-account-key.json');
    console.log('\n2. Verify your service account key file exists and is valid');
    console.log('\n3. Check that your bucket exists in Google Cloud Console');
    console.log('\n4. Ensure your service account has Storage Object Admin permissions');
  }
}

testGoogleCloudStorage(); 