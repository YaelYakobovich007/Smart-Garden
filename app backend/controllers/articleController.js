const {
    getAllArticles,
    getArticleById,
    getArticlesByCategory,
    getArticleCategories
} = require('../models/articleModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');

/**
 * Article Controller - WebSocket message handlers for article operations
 * 
 * This module handles WebSocket messages related to articles including:
 * - Fetching all articles
 * - Getting specific articles by ID
 * - Filtering articles by category
 * - Getting available categories
 */

const articleHandlers = {
    GET_ALL_ARTICLES: handleGetAllArticles,
    GET_ARTICLE_BY_ID: handleGetArticleById,
    GET_ARTICLES_BY_CATEGORY: handleGetArticlesByCategory,
    GET_ARTICLE_CATEGORIES: handleGetArticleCategories
};

/**
 * Main article message handler
 * Routes article-related WebSocket messages to appropriate handlers
 * @param {Object} data - Message data from client
 * @param {WebSocket} ws - WebSocket connection
 */
async function handleArticleMessage(data, ws) {
    try {
        const handler = articleHandlers[data.type];
        if (handler) {
            await handler(data, ws);
        } else {
            sendError(ws, 'UNKNOWN_TYPE', `Unknown article message type: ${data.type}`);
        }
    } catch (err) {
        console.log(`[ARTICLE] Error handling message: ${err.message}`);
        sendError(ws, 'ARTICLE_ERROR', 'Internal server error while processing article request');
    }
}

/**
 * Handle GET_ALL_ARTICLES message
 * Returns all articles from the database
 * @param {Object} data - Message data (no additional data needed)
 * @param {WebSocket} ws - WebSocket connection
 */
async function handleGetAllArticles(data, ws) {
    try {
        console.log('[ARTICLE] Getting all articles');

        const articles = await getAllArticles();

        console.log(`[ARTICLE] Retrieved ${articles.length} articles`);

        sendSuccess(ws, 'GET_ALL_ARTICLES_SUCCESS', {
            articles: articles,
            count: articles.length
        });
    } catch (error) {
        console.log(`[ARTICLE] Error: Failed to get all articles - ${error.message}`);
        sendError(ws, 'GET_ALL_ARTICLES_FAIL', 'Failed to retrieve articles from database');
    }
}

/**
 * Handle GET_ARTICLE_BY_ID message
 * Returns a specific article by its ID
 * @param {Object} data - Message data containing article_id
 * @param {WebSocket} ws - WebSocket connection
 */
async function handleGetArticleById(data, ws) {
    try {
        const { article_id } = data;

        if (!article_id) {
            return sendError(ws, 'GET_ARTICLE_BY_ID_FAIL', 'Missing article_id parameter');
        }

        console.log(`[ARTICLE] Getting by ID: ${article_id}`);

        const article = await getArticleById(article_id);

        if (!article) {
            return sendError(ws, 'GET_ARTICLE_BY_ID_FAIL', `Article with ID ${article_id} not found`);
        }

        console.log(`[ARTICLE] Retrieved: id=${article_id} title=${article.title}`);

        sendSuccess(ws, 'GET_ARTICLE_BY_ID_SUCCESS', {
            article: article
        });
    } catch (error) {
        console.log(`[ARTICLE] Error: Failed to get by ID - ${error.message}`);
        sendError(ws, 'GET_ARTICLE_BY_ID_FAIL', 'Failed to retrieve article from database');
    }
}

/**
 * Handle GET_ARTICLES_BY_CATEGORY message
 * Returns articles filtered by category
 * @param {Object} data - Message data containing category
 * @param {WebSocket} ws - WebSocket connection
 */
async function handleGetArticlesByCategory(data, ws) {
    try {
        const { category } = data;

        if (!category) {
            return sendError(ws, 'GET_ARTICLES_BY_CATEGORY_FAIL', 'Missing category parameter');
        }

        console.log(`[ARTICLE] Getting by category: ${category}`);

        const articles = await getArticlesByCategory(category);

        console.log(`[ARTICLE] Retrieved ${articles.length} articles in category: ${category}`);

        sendSuccess(ws, 'GET_ARTICLES_BY_CATEGORY_SUCCESS', {
            articles: articles,
            category: category,
            count: articles.length
        });
    } catch (error) {
        console.log(`[ARTICLE] Error: Failed to get by category - ${error.message}`);
        sendError(ws, 'GET_ARTICLES_BY_CATEGORY_FAIL', 'Failed to retrieve articles by category');
    }
}

/**
 * Handle GET_ARTICLE_CATEGORIES message
 * Returns all available article categories
 * @param {Object} data - Message data (no additional data needed)
 * @param {WebSocket} ws - WebSocket connection
 */
async function handleGetArticleCategories(data, ws) {
    try {
        console.log('[ARTICLE] Getting categories');

        const categories = await getArticleCategories();

        console.log(`[ARTICLE] Retrieved ${categories.length} categories`);

        sendSuccess(ws, 'GET_ARTICLE_CATEGORIES_SUCCESS', {
            categories: categories,
            count: categories.length
        });
    } catch (error) {
        console.log(`[ARTICLE] Error: Failed to get categories - ${error.message}`);
        sendError(ws, 'GET_ARTICLE_CATEGORIES_FAIL', 'Failed to retrieve article categories');
    }
}

module.exports = {
    handleArticleMessage,
    articleHandlers
};
