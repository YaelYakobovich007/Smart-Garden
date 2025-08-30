import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { getAllArticles, cleanupArticleHandlers } from '../../../../services/articleService';
import styles from './styles';

const ArticlesList = () => {
  const navigation = useNavigation();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch articles from backend on component mount
  useEffect(() => {
    const fetchArticles = () => {
      getAllArticles(
        (data) => {
          setArticles(data);
          setLoading(false);
        },
        (error) => {
          setError(error);
          setLoading(false);
        }
      );
    };

    fetchArticles();

    // Cleanup handlers on unmount
    return () => {
      cleanupArticleHandlers();
    };
  }, []);

  const handleArticlePress = (article) => {
    navigation.navigate('ArticleDetails', { article });
  };

  const renderArticleItem = ({ item: article }) => (
    <TouchableOpacity
      style={styles.articleItem}
      onPress={() => handleArticlePress(article)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: article.image_url }} style={styles.articleImage} />
      <View style={styles.articleContent}>
        <View style={styles.articleHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
          <Text style={styles.readTime}>{article.read_time}</Text>
        </View>
        <Text style={styles.articleTitle} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={styles.articleDescription} numberOfLines={3}>
          {article.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Articles</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 10, color: '#7F8C8D' }}>
            Loading articles...
          </Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#E74C3C', textAlign: 'center', paddingHorizontal: 20 }}>
            {error}
          </Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.article_id.toString()}
          renderItem={renderArticleItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default ArticlesList; 