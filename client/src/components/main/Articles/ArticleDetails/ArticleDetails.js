import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import styles from './styles';

const ArticleDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { article } = route.params;

  const formatContent = (content) => {
    // Simple markdown-like formatting
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <Text key={index} style={styles.mainTitle}>
            {line.substring(2)}
          </Text>
        );
      } else if (line.startsWith('## ')) {
        return (
          <Text key={index} style={styles.sectionTitle}>
            {line.substring(3)}
          </Text>
        );
      } else if (line.startsWith('### ')) {
        return (
          <Text key={index} style={styles.subsectionTitle}>
            {line.substring(4)}
          </Text>
        );
      } else if (line.startsWith('- ')) {
        return (
          <View key={index} style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{line.substring(2)}</Text>
          </View>
        );
      } else if (line.trim() === '') {
        return <View key={index} style={styles.paragraphSpacing} />;
      } else {
        return (
          <Text key={index} style={styles.paragraph}>
            {line}
          </Text>
        );
      }
    });
  };

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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Article</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Article Image */}
        <View style={styles.imageContainer}>
          <Image source={article.image} style={styles.articleImage} />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
        </View>

        {/* Article Content */}
        <View style={styles.contentContainer}>
          {/* Article Header */}
          <View style={styles.articleHeader}>
            <Text style={styles.articleTitle}>{article.title}</Text>
            <Text style={styles.articleDescription}>{article.description}</Text>
            
            <View style={styles.articleMeta}>
              <View style={styles.readTimeContainer}>
                <Feather name="clock" size={16} color="#7F8C8D" />
                <Text style={styles.readTimeText}>{article.readTime}</Text>
              </View>
              <View style={styles.categoryContainer}>
                <Feather name="tag" size={16} color="#4CAF50" />
                <Text style={styles.categoryMetaText}>{article.category}</Text>
              </View>
            </View>
          </View>

          {/* Article Body */}
          <View style={styles.articleBody}>
            {formatContent(article.content)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default ArticleDetails; 