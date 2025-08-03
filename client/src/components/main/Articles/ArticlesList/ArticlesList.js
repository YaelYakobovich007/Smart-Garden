import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { articles } from '../../../../data/articles';
import styles from './styles';

const ArticlesList = () => {
  const navigation = useNavigation();

  const handleArticlePress = (article) => {
    navigation.navigate('ArticleDetails', { article });
  };

  const renderArticleItem = ({ item: article }) => (
    <TouchableOpacity
      style={styles.articleItem}
      onPress={() => handleArticlePress(article)}
      activeOpacity={0.8}
    >
      <Image source={article.image} style={styles.articleImage} />
      <View style={styles.articleContent}>
        <View style={styles.articleHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
          <Text style={styles.readTime}>{article.readTime}</Text>
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
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="chevron-left" size={24} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Articles</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderArticleItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default ArticlesList; 