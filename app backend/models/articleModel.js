const { pool } = require('../config/database');

/**
 * Article Model - Database operations for gardening articles
 * 
 * This module handles all database operations for articles including:
 * - Creating and retrieving articles
 * - Managing article metadata and content
 * - Image URL management via Google Cloud Storage
 */

/**
 * Get all articles from the database
 * @returns {Promise<Array>} Array of article objects
 */
async function getAllArticles() {
    try {
        const result = await pool.query(`
      SELECT 
        article_id,
        title,
        description,
        category,
        read_time,
        image_url,
        content,
        created_at,
        updated_at
      FROM articles 
      ORDER BY created_at DESC
    `);
        return result.rows;
    } catch (error) {
        console.error('Error getting all articles:', error);
        throw error;
    }
}

/**
 * Get article by ID
 * @param {number} articleId - The article ID to retrieve
 * @returns {Promise<Object|null>} Article object or null if not found
 */
async function getArticleById(articleId) {
    try {
        const result = await pool.query(`
      SELECT 
        article_id,
        title,
        description,
        category,
        read_time,
        image_url,
        content,
        created_at,
        updated_at
      FROM articles 
      WHERE article_id = $1
    `, [articleId]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting article by ID:', error);
        throw error;
    }
}

/**
 * Get articles by category
 * @param {string} category - The category to filter by
 * @returns {Promise<Array>} Array of articles in the specified category
 */
async function getArticlesByCategory(category) {
    try {
        const result = await pool.query(`
      SELECT 
        article_id,
        title,
        description,
        category,
        read_time,
        image_url,
        content,
        created_at,
        updated_at
      FROM articles 
      WHERE category = $1
      ORDER BY created_at DESC
    `, [category]);

        return result.rows;
    } catch (error) {
        console.error('Error getting articles by category:', error);
        throw error;
    }
}

/**
 * Add a new article to the database
 * @param {Object} articleData - Article data object
 * @param {string} articleData.title - Article title
 * @param {string} articleData.description - Article description
 * @param {string} articleData.category - Article category
 * @param {string} articleData.readTime - Estimated read time
 * @param {string} articleData.imageUrl - Google Cloud Storage image URL
 * @param {string} articleData.content - Article content (markdown)
 * @returns {Promise<Object>} Created article object
 */
async function addArticle(articleData) {
    try {
        const { title, description, category, readTime, imageUrl, content } = articleData;

        const result = await pool.query(`
      INSERT INTO articles (
        title, 
        description, 
        category, 
        read_time, 
        image_url, 
        content
      ) VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `, [title, description, category, readTime, imageUrl, content]);

        return result.rows[0];
    } catch (error) {
        console.error('Error adding article:', error);
        throw error;
    }
}

/**
 * Update an existing article
 * @param {number} articleId - The article ID to update
 * @param {Object} articleData - Updated article data
 * @returns {Promise<Object|null>} Updated article object or null if not found
 */
async function updateArticle(articleId, articleData) {
    try {
        const { title, description, category, readTime, imageUrl, content } = articleData;

        const result = await pool.query(`
      UPDATE articles 
      SET 
        title = $1,
        description = $2,
        category = $3,
        read_time = $4,
        image_url = $5,
        content = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE article_id = $7
      RETURNING *
    `, [title, description, category, readTime, imageUrl, content, articleId]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error updating article:', error);
        throw error;
    }
}

/**
 * Delete an article by ID
 * @param {number} articleId - The article ID to delete
 * @returns {Promise<boolean>} True if article was deleted, false if not found
 */
async function deleteArticle(articleId) {
    try {
        const result = await pool.query(`
      DELETE FROM articles 
      WHERE article_id = $1
    `, [articleId]);

        return result.rowCount > 0;
    } catch (error) {
        console.error('Error deleting article:', error);
        throw error;
    }
}

/**
 * Get article categories
 * @returns {Promise<Array>} Array of unique category names
 */
async function getArticleCategories() {
    try {
        const result = await pool.query(`
      SELECT DISTINCT category 
      FROM articles 
      ORDER BY category
    `);

        return result.rows.map(row => row.category);
    } catch (error) {
        console.error('Error getting article categories:', error);
        throw error;
    }
}

module.exports = {
    getAllArticles,
    getArticleById,
    getArticlesByCategory,
    addArticle,
    updateArticle,
    deleteArticle,
    getArticleCategories
};
