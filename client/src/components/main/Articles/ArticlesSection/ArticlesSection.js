/**
 * Articles Section Component - Gardening Tips and Articles Display
 * 
 * This component displays a horizontal scrollable list of gardening articles.
 * It shows:
 * - Article thumbnails and titles
 * - Article descriptions and categories
 * - Read time information
 * - Navigation to article details and full list
 * 
 * The component provides educational content to help users with
 * gardening tips and best practices.
 */

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

const ArticlesSection = () => {
  const navigation = useNavigation();

  /**
   * Handle article card press
   * Navigates to article details screen with article data
   * @param {Object} article - Article object to view details for
   */
  const handleArticlePress = (article) => {
    navigation.navigate('ArticleDetails', { article });
  };

  /**
   * Handle "See All" button press
   * Navigates to articles list screen showing all articles
   */
  const handleSeeAllPress = () => {
    navigation.navigate('ArticlesList');
  };

  /**
   * Render individual article card
   * Displays article image, title, description, and metadata
   * @param {Object} item - Article data object
   * @returns {JSX.Element} Article card component
   */
  const renderArticleCard = ({ item }) => (
    <TouchableOpacity
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        overflow: 'hidden',
        width: 280,
        marginRight: 16,
      }}
      onPress={() => handleArticlePress(item)}
    >
      {/* Article Image */}
      <Image source={item.image} style={{ width: '100%', height: 160 }} />
      
      {/* Article Content */}
      <View style={{ padding: 16, flex: 1 }}>
        {/* Article Header with Category Badge */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{
            backgroundColor: '#4CAF50',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>{item.category}</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#7F8C8D' }}>{item.readTime}</Text>
        </View>

        {/* Article Title */}
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#2C3E50',
          marginBottom: 8,
          lineHeight: 22,
        }} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Article Description */}
        <Text style={{
          fontSize: 14,
          color: '#7F8C8D',
          lineHeight: 20,
          marginBottom: 12,
        }} numberOfLines={3}>
          {item.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  /**
   * Render the articles section with header and article list
   * Shows section title, "See All" button, and horizontal article list
   */
  return (
    <View style={{ marginVertical: 16 }}>
      {/* Section Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: '600',
          color: '#2C3E50',
        }}>Gardening Tips & Articles</Text>
        <TouchableOpacity onPress={handleSeeAllPress} style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}>
          <Text style={{
            fontSize: 14,
            color: '#4CAF50',
            fontWeight: '500',
          }}>See All</Text>
          <Feather name="chevron-right" size={16} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Articles Horizontal List */}
      <FlatList
        data={articles.slice(0, 5)} // Show first 5 articles
        renderItem={renderArticleCard}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
      />
    </View>
  );
};

export default ArticlesSection; 