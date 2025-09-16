import websocketService from './websocketService';

/**
 * Article Service - Handles communication with backend for articles
 * Uses WebSocket to fetch articles from the database
 */

// Message handlers for article responses
const messageHandlers = new Map();

/**
 * Get all articles from the backend
 * @param {Function} onSuccess - Callback when articles are received
 * @param {Function} onError - Callback when error occurs
 */
export const getAllArticles = (onSuccess, onError) => {
    const messageId = `get_all_articles_${Date.now()}`;

    messageHandlers.set(messageId, {
        type: 'GET_ALL_ARTICLES',
        onSuccess,
        onError
    });

    const message = {
        type: 'GET_ALL_ARTICLES',
        messageId
    };
    websocketService.sendMessage(message);
};

/**
 * Get article by ID from the backend
 * @param {number} articleId - The article ID to fetch
 * @param {Function} onSuccess - Callback when article is received
 * @param {Function} onError - Callback when error occurs
 */
export const getArticleById = (articleId, onSuccess, onError) => {
    const messageId = `get_article_${articleId}_${Date.now()}`;

    messageHandlers.set(messageId, {
        type: 'GET_ARTICLE_BY_ID',
        onSuccess,
        onError
    });

    websocketService.sendMessage({
        type: 'GET_ARTICLE_BY_ID',
        messageId,
        articleId
    });
};

/**
 * Get articles by category from the backend
 * @param {string} category - The category to filter by
 * @param {Function} onSuccess - Callback when articles are received
 * @param {Function} onError - Callback when error occurs
 */
export const getArticlesByCategory = (category, onSuccess, onError) => {
    const messageId = `get_articles_category_${category}_${Date.now()}`;

    messageHandlers.set(messageId, {
        type: 'GET_ARTICLES_BY_CATEGORY',
        onSuccess,
        onError
    });

    websocketService.sendMessage({
        type: 'GET_ARTICLES_BY_CATEGORY',
        messageId,
        category
    });
};

/**
 * Get all article categories from the backend
 * @param {Function} onSuccess - Callback when categories are received
 * @param {Function} onError - Callback when error occurs
 */
export const getArticleCategories = (onSuccess, onError) => {
    const messageId = `get_categories_${Date.now()}`;

    messageHandlers.set(messageId, {
        type: 'GET_ARTICLE_CATEGORIES',
        onSuccess,
        onError
    });

    websocketService.sendMessage({
        type: 'GET_ARTICLE_CATEGORIES',
        messageId
    });
};

/**
 * Handle incoming article messages from WebSocket
 * @param {Object} message - The message from WebSocket
 */
export const handleArticleMessage = (message) => {

    for (const [messageId, handler] of messageHandlers.entries()) {
        if (handler.type === 'GET_ALL_ARTICLES' && message.type === 'GET_ALL_ARTICLES_SUCCESS') {
            if (handler.onSuccess) {
                handler.onSuccess(message.articles);
            }
            messageHandlers.delete(messageId);
            return;
        }
    }

};

/**
 * Clean up all article message handlers
 */
export const cleanupArticleHandlers = () => {
    messageHandlers.clear();
    websocketService.offMessage('GET_ALL_ARTICLES_SUCCESS', handleArticleMessage);
    websocketService.offMessage('GET_ARTICLE_BY_ID_SUCCESS', handleArticleMessage);
    websocketService.offMessage('GET_ARTICLES_BY_CATEGORY_SUCCESS', handleArticleMessage);
    websocketService.offMessage('GET_ARTICLE_CATEGORIES_SUCCESS', handleArticleMessage);
};

// Register the message handler with the WebSocket service
websocketService.onMessage('GET_ALL_ARTICLES_SUCCESS', handleArticleMessage);
websocketService.onMessage('GET_ARTICLE_BY_ID_SUCCESS', handleArticleMessage);
websocketService.onMessage('GET_ARTICLES_BY_CATEGORY_SUCCESS', handleArticleMessage);
websocketService.onMessage('GET_ARTICLE_CATEGORIES_SUCCESS', handleArticleMessage);
