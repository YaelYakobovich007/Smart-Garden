const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { pool } = require('../config/database');
const googleCloudStorage = require('../services/googleCloudStorage');

/**
 * Migration script to migrate existing articles from client to backend
 * 
 * This script:
 * 1. Uploads existing article images to Google Cloud Storage
 * 2. Migrates article data to the database
 * 3. Updates image URLs to point to cloud storage
 */

// Existing articles data (updated from client/src/data/articles.js)
const existingArticles = [
    {
        id: 1,
        title: "10 Organic Fertilizers Every Gardener Should Use to Boost Plant Growth Naturally",
        description: "Discover the best organic fertilizers that provide essential nutrients while improving soil structure naturally.",
        category: "Fertilizers",
        readTime: "8 min read",
        imageFileName: "10 Organic Fertilizers Every Gardener Should Use to Boost Plant Growth Naturally.jpg",
        content: `
# 10 Organic Fertilizers Every Gardener Should Use to Boost Plant Growth Naturally

Organic fertilizers are essential for sustainable gardening and provide plants with the nutrients they need while improving soil health. Here are the top 10 organic fertilizers every gardener should consider:

## 1. Compost
Compost is the foundation of organic gardening. It improves soil structure, provides essential nutrients, and supports beneficial microorganisms.

**Benefits:**
- Improves soil structure and water retention
- Provides balanced nutrients
- Supports beneficial soil life
- Reduces waste through recycling

**How to use:** Apply 2-4 inches of compost to your garden beds in spring and fall.

## 2. Manure
Well-aged animal manure is an excellent source of nitrogen and other nutrients.

**Types:**
- Cow manure: Balanced nutrients, good for most plants
- Chicken manure: High in nitrogen, use sparingly
- Horse manure: Good for improving soil structure

**How to use:** Apply aged manure (6+ months old) at 1-2 inches per season.

## 3. Fish Emulsion
A liquid fertilizer made from fish byproducts, rich in nitrogen and trace minerals.

**Benefits:**
- Quick-acting nitrogen source
- Contains trace minerals
- Safe for most plants
- Easy to apply

**How to use:** Dilute according to package instructions and apply every 2-4 weeks during growing season.

## 4. Bone Meal
Made from ground animal bones, rich in phosphorus and calcium.

**Benefits:**
- Excellent for root development
- High in phosphorus
- Good for flowering plants
- Long-lasting effects

**How to use:** Apply 1-2 tablespoons per plant at planting time.

## 5. Blood Meal
Dried, powdered blood rich in nitrogen.

**Benefits:**
- High nitrogen content
- Quick-acting
- Good for leafy growth
- Organic nitrogen source

**How to use:** Apply sparingly (1-2 tablespoons per plant) to avoid burning plants.

## 6. Alfalfa Meal
Made from alfalfa plants, provides balanced nutrients and growth hormones.

**Benefits:**
- Contains natural growth hormones
- Balanced nutrient profile
- Improves soil structure
- Safe for all plants

**How to use:** Apply 1-2 cups per 10 square feet of garden area.

## 7. Kelp Meal
Dried seaweed rich in trace minerals and growth hormones.

**Benefits:**
- Rich in trace minerals
- Contains natural growth hormones
- Improves plant stress resistance
- Enhances root development

**How to use:** Apply 1-2 tablespoons per plant or 1-2 cups per 10 square feet.

## 8. Worm Castings
Vermicompost produced by earthworms, excellent all-around fertilizer.

**Benefits:**
- Balanced nutrient profile
- Improves soil structure
- Contains beneficial microorganisms
- Safe for all plants

**How to use:** Apply 1-2 inches to garden beds or use as potting soil amendment.

## 9. Green Manure
Cover crops grown and tilled into the soil to add organic matter and nutrients.

**Popular options:**
- Clover: Nitrogen-fixing, good for soil improvement
- Rye: Excellent for weed suppression
- Buckwheat: Quick-growing, good for pollinators

**How to use:** Plant in fall or early spring, till under before planting main crops.

## 10. Coffee Grounds
Used coffee grounds provide nitrogen and improve soil structure.

**Benefits:**
- Good source of nitrogen
- Improves soil structure
- Attracts earthworms
- Free and readily available

**How to use:** Apply 1-2 cups per plant, mix into soil or use as mulch.

## Tips for Using Organic Fertilizers

1. **Test your soil** before applying fertilizers to understand what nutrients are needed
2. **Rotate fertilizers** to provide balanced nutrition
3. **Apply at the right time** - most fertilizers work best when applied in spring
4. **Don't over-fertilize** - organic fertilizers are generally safer but can still cause problems if over-applied
5. **Combine with good soil practices** - organic fertilizers work best with healthy soil

## Cost-Effective Options

To cut down on cost, buy alfalfa meal fertilizer in bulk from seed companies or livestock feed stores. You can also make your own compost and worm castings to reduce fertilizer costs while improving your soil naturally.

Remember, the best fertilizer is the one that works for your specific garden conditions and plant needs. Start with a few options and observe how your plants respond to find the perfect combination for your garden.
    `
    },
    {
        id: 2,
        title: "Underrated Plants That Deserve a Spot in Your Garden",
        description: "Discover beautiful and resilient plants that often get overlooked but can transform your garden.",
        category: "Plant Selection",
        readTime: "6 min read",
        imageFileName: "Underrated plants.jpg",
        content: `
# Underrated Plants That Deserve a Spot in Your Garden

While popular plants like roses and hydrangeas get most of the attention, there are many underrated plants that offer beauty, resilience, and unique characteristics. Here are some overlooked gems that deserve a place in your garden:

## 1. Russian Sage (Perovskia atriplicifolia)
This drought-tolerant perennial offers beautiful purple-blue flowers and silvery foliage.

**Why it's underrated:**
- Extremely drought-tolerant
- Attracts pollinators
- Deer-resistant
- Long blooming period
- Low maintenance

**Growing tips:** Plant in full sun with well-draining soil. Cut back in early spring.

## 2. Japanese Forest Grass (Hakonechloa macra)
A graceful ornamental grass that adds texture and movement to shady areas.

**Why it's underrated:**
- Perfect for shade gardens
- Beautiful cascading habit
- Low maintenance
- Deer-resistant
- Adds texture year-round

**Growing tips:** Plant in partial to full shade with rich, moist soil.

## 3. Anise Hyssop (Agastache foeniculum)
A native perennial that attracts pollinators and has fragrant foliage.

**Why it's underrated:**
- Native plant benefits
- Attracts bees and butterflies
- Drought-tolerant
- Fragrant foliage
- Long blooming season

**Growing tips:** Plant in full sun with well-draining soil. Deadhead for extended bloom.

## 4. Coral Bells (Heuchera)
These versatile perennials offer colorful foliage and delicate flowers.

**Why it's underrated:**
- Colorful foliage year-round
- Shade-tolerant
- Low maintenance
- Many varieties available
- Deer-resistant

**Growing tips:** Plant in partial shade with rich, well-draining soil.

## 5. Threadleaf Coreopsis (Coreopsis verticillata)
A tough, long-blooming perennial that's perfect for hot, dry areas.

**Why it's underrated:**
- Extremely drought-tolerant
- Long blooming period
- Low maintenance
- Attracts pollinators
- Deer-resistant

**Growing tips:** Plant in full sun with well-draining soil. Divide every 3-4 years.

## 6. Japanese Painted Fern (Athyrium niponicum)
A beautiful fern with metallic silver and burgundy foliage.

**Why it's underrated:**
- Beautiful foliage color
- Shade-loving
- Low maintenance
- Deer-resistant
- Adds texture to shade gardens

**Growing tips:** Plant in partial to full shade with rich, moist soil.

## 7. Catmint (Nepeta)
A tough perennial that blooms all summer and attracts pollinators.

**Why it's underrated:**
- Long blooming period
- Drought-tolerant
- Attracts bees and butterflies
- Deer-resistant
- Low maintenance

**Growing tips:** Plant in full sun with well-draining soil. Shear after first bloom for rebloom.

## 8. Switchgrass (Panicum virgatum)
A native grass that provides year-round interest and wildlife habitat.

**Why it's underrated:**
- Native plant benefits
- Year-round interest
- Drought-tolerant
- Provides wildlife habitat
- Low maintenance

**Growing tips:** Plant in full sun with well-draining soil. Cut back in early spring.

## 9. Hardy Geranium (Geranium)
These tough perennials offer long bloom periods and attractive foliage.

**Why it's underrated:**
- Long blooming period
- Low maintenance
- Deer-resistant
- Many varieties available
- Good ground cover

**Growing tips:** Plant in partial shade with rich, well-draining soil.

## 10. Joe Pye Weed (Eutrochium)
A tall native perennial that attracts butterflies and provides late-season color.

**Why it's underrated:**
- Native plant benefits
- Attracts butterflies
- Late-season bloom
- Tall stature for back of border
- Low maintenance

**Growing tips:** Plant in full sun to partial shade with rich, moist soil.

## Tips for Growing Underrated Plants

1. **Research growing conditions** before planting
2. **Start with a few plants** to test in your garden
3. **Consider native plants** for better wildlife support
4. **Don't be afraid to experiment** with new plants
5. **Look beyond the garden center** - many underrated plants are available online

## Benefits of Growing Underrated Plants

- **More variety** in your garden
- **Better resilience** - many underrated plants are tougher than popular choices
- **Support biodiversity** - especially with native plants
- **Unique garden character** - stand out from typical gardens
- **Cost-effective** - many underrated plants are less expensive

Remember, the best plants for your garden are the ones that thrive in your specific conditions. Don't be afraid to try something different - you might discover your new favorite plant!
    `
    },
    {
        id: 3,
        title: "6 Easy Ways To Tell If Your Plants Need Watering",
        description: "Learn simple techniques to determine when your plants need water and avoid over or under-watering.",
        category: "Care Tips",
        readTime: "5 min read",
        imageFileName: "6 Easy Ways To Tell If Your Plants Need Watering.jpg",
        content: `
# 6 Easy Ways To Tell If Your Plants Need Watering

Proper watering is one of the most important aspects of plant care, but it can also be one of the most challenging. Over-watering and under-watering are common problems that can harm your plants. Here are six simple ways to determine if your plants need water:

## 1. The Finger Test
The most reliable method is to stick your finger into the soil.

**How to do it:**
- Insert your finger 1-2 inches into the soil
- If the soil feels dry, it's time to water
- If the soil feels moist, wait a day or two
- If the soil feels wet, don't water

**Best for:** Most indoor and outdoor plants

## 2. The Weight Test
Lift your pot to feel its weight - a dry pot will feel lighter.

**How to do it:**
- Lift the pot after watering to feel its weight
- Check the weight again when you think it needs water
- If it feels significantly lighter, it needs water
- If it still feels heavy, wait longer

**Best for:** Potted plants, especially larger containers

## 3. The Soil Color Test
Dry soil is lighter in color than moist soil.

**How to do it:**
- Look at the surface of the soil
- Dry soil appears lighter brown or gray
- Moist soil appears darker brown
- Check several spots in the pot

**Best for:** Plants in containers with visible soil

## 4. The Leaf Test
Check your plant's leaves for signs of water stress.

**Signs of under-watering:**
- Leaves feel crispy or brittle
- Leaves are drooping or wilting
- Leaf edges are brown and crispy
- New growth is stunted

**Signs of over-watering:**
- Leaves are yellowing
- Leaves feel soft and mushy
- Stems are soft or rotting
- Soil smells musty

**Best for:** All plants, especially those with visible leaves

## 5. The Moisture Meter Test
Use a moisture meter for precise readings.

**How to use:**
- Insert the probe into the soil
- Read the moisture level on the meter
- Water when the meter indicates "dry"
- Don't water when it shows "wet"

**Best for:** Indoor plants, especially expensive or delicate plants

## 6. The Calendar Method
Establish a watering schedule based on your plant's needs.

**How to create a schedule:**
- Research your plant's water needs
- Consider your climate and season
- Start with a basic schedule
- Adjust based on the other tests

**Example schedule:**
- Succulents: Every 2-3 weeks
- Tropical plants: Every 1-2 weeks
- Most houseplants: Every 1-2 weeks
- Outdoor plants: Varies by climate

**Best for:** Beginners or busy gardeners

## Watering Tips for Different Plant Types

### Succulents and Cacti
- Water deeply but infrequently
- Let soil dry completely between waterings
- Reduce watering in winter
- Use well-draining soil

### Tropical Plants
- Keep soil consistently moist
- Don't let soil dry out completely
- Increase humidity if possible
- Water more frequently in summer

### Herbs
- Keep soil moderately moist
- Don't let soil dry out completely
- Water at the base, not the leaves
- Harvest regularly to promote growth

### Vegetables
- Keep soil consistently moist
- Water deeply to encourage deep roots
- Water in the morning to reduce disease
- Mulch to retain moisture

## Common Watering Mistakes to Avoid

1. **Watering on a strict schedule** - plants' needs vary
2. **Watering the leaves instead of the soil** - can cause disease
3. **Using cold water** - can shock plants
4. **Watering at night** - can promote fungal growth
5. **Not adjusting for seasons** - plants need less water in winter

## Signs You're Watering Correctly

- Plants have healthy, green leaves
- New growth appears regularly
- Roots are white and healthy
- Soil feels moderately moist
- No signs of disease or pests

## When to Adjust Your Watering

- **Hot weather** - plants need more water
- **Cold weather** - plants need less water
- **New plants** - may need more frequent watering
- **Established plants** - can often go longer between waterings
- **Flowering plants** - may need more water during bloom

Remember, it's better to underwater than overwater. Most plants can recover from being slightly dry, but overwatering can quickly kill a plant. Use these methods together to develop your watering intuition and keep your plants healthy and thriving.
    `
    },
    {
        id: 4,
        title: "Here's Why Morning Is the Best Time to Water Plants",
        description: "Discover the science behind optimal watering times and why morning watering leads to healthier plants.",
        category: "Care Tips",
        readTime: "6 min read",
        imageFileName: "Heres Why Morning Is the Best Time to Water Plants.jpg",
        content: `
# Here's Why Morning Is the Best Time to Water Plants

Timing your watering can make a significant difference in your plants' health and growth. While you can water plants at any time of day, morning watering provides the most benefits. Here's why morning is the optimal time to water your plants:

## The Science Behind Morning Watering

### 1. Reduced Evaporation
Morning temperatures are typically cooler, which means less water is lost to evaporation.

**Benefits:**
- More water reaches the roots
- Less water waste
- More efficient watering
- Lower water bills

**How it works:** Water evaporates more slowly in cooler temperatures, giving plants more time to absorb moisture.

### 2. Optimal Root Absorption
Plants are most active in the morning, making them better at absorbing water.

**Benefits:**
- Better water uptake
- Improved nutrient absorption
- Healthier root development
- Stronger plants

**How it works:** Plant roots are most active during daylight hours, especially in the morning.

### 3. Disease Prevention
Morning watering allows leaves to dry quickly, reducing fungal disease risk.

**Benefits:**
- Less fungal disease
- Healthier foliage
- Reduced plant stress
- Better overall plant health

**How it works:** Water on leaves evaporates quickly in morning sun, preventing fungal growth.

## Morning vs. Other Times

### Morning Watering (Best)
**Pros:**
- Reduced evaporation
- Better root absorption
- Disease prevention
- Plants are most active
- Natural timing

**Cons:**
- Requires early rising
- May not fit busy schedules

### Afternoon Watering (Acceptable)
**Pros:**
- Convenient timing
- Good for busy schedules
- Still effective

**Cons:**
- Higher evaporation rates
- Less efficient water use
- May stress plants in hot weather

### Evening Watering (Least Ideal)
**Pros:**
- Convenient timing
- Cooler temperatures

**Cons:**
- Increased disease risk
- Poor root absorption
- Water sits on leaves overnight
- Attracts pests

## Best Practices for Morning Watering

### 1. Water Early
**Optimal time:** 6-10 AM
- Plants are most active
- Temperatures are cool
- Sun is not too intense
- Leaves dry quickly

### 2. Water Deeply
**How to do it:**
- Water until soil is moist 6-8 inches deep
- Allow water to soak in slowly
- Don't water again until soil is dry
- Use drip irrigation or soaker hoses

### 3. Water at the Base
**Why it's important:**
- Prevents leaf diseases
- More efficient water use
- Better root development
- Reduces fungal growth

### 4. Adjust for Weather
**Hot, dry weather:**
- Water more frequently
- Water earlier in the morning
- Consider evening watering for heat-stressed plants

**Cool, wet weather:**
- Water less frequently
- Check soil moisture before watering
- Reduce watering schedule

## Special Considerations

### Indoor Plants
- Morning watering is still best
- Consider humidity levels
- Adjust for air conditioning
- Use room temperature water

### Container Plants
- May need more frequent watering
- Check moisture daily
- Water when top inch is dry
- Consider self-watering containers

### Vegetable Gardens
- Morning watering is crucial
- Water at soil level
- Avoid overhead watering
- Mulch to retain moisture

### Lawns
- Water early morning (4-8 AM)
- Water deeply and infrequently
- Adjust for grass type
- Consider local watering restrictions

## Signs You're Watering at the Right Time

- Plants look healthy and vibrant
- No signs of water stress
- Good new growth
- No fungal diseases
- Efficient water use

## When to Break the Morning Rule

### Emergency Watering
- If plants are severely wilted
- During extreme heat
- For newly planted specimens
- When soil is bone dry

### Special Circumstances
- Automatic irrigation systems
- Vacation watering
- Specific plant requirements
- Local watering restrictions

## Tips for Morning Watering Success

1. **Set a routine** - water at the same time each day
2. **Check the weather** - adjust for rain or extreme heat
3. **Use the right tools** - drip irrigation, soaker hoses, or watering cans
4. **Monitor your plants** - look for signs of over or under-watering
5. **Be consistent** - plants thrive on regular watering schedules

## Watering Schedule Examples

### Summer Schedule
- **Morning:** 6-8 AM
- **Frequency:** Every 1-3 days
- **Amount:** Deep watering
- **Adjustments:** More frequent in heat waves

### Spring/Fall Schedule
- **Morning:** 7-9 AM
- **Frequency:** Every 3-7 days
- **Amount:** Moderate watering
- **Adjustments:** Less frequent in cool weather

### Winter Schedule
- **Morning:** 8-10 AM
- **Frequency:** Every 7-14 days
- **Amount:** Light watering
- **Adjustments:** Reduce for dormant plants

Remember, while morning watering is ideal, the most important thing is to water your plants when they need it. If you can't water in the morning, afternoon watering is still effective. The key is to be consistent and attentive to your plants' needs.
    `
    },
    {
        id: 5,
        title: "The Benefits of Automatic Irrigation Over Hand Watering",
        description: "Explore how automatic irrigation systems can save time, water, and improve plant health compared to manual watering.",
        category: "Technology",
        readTime: "7 min read",
        imageFileName: "The Benefits of Automatic Irrigation Over Hand Watering.jpg",
        content: `
# The Benefits of Automatic Irrigation Over Hand Watering

While hand watering has been the traditional method for centuries, automatic irrigation systems offer numerous advantages that can transform your gardening experience. Here's why automatic irrigation is becoming the preferred choice for serious gardeners:

## Water Conservation Benefits

### 1. Precise Water Delivery
Automatic systems deliver water exactly where and when it's needed.

**Advantages:**
- No water waste from overspray
- Targeted root zone watering
- Reduced runoff
- Better water efficiency

**How it works:** Drip irrigation and soaker hoses deliver water directly to plant roots, minimizing evaporation and runoff.

### 2. Consistent Watering
Automatic systems provide uniform coverage that's difficult to achieve by hand.

**Benefits:**
- Even plant growth
- No dry spots
- Consistent soil moisture
- Better plant health

**Results:** Plants receive the same amount of water regardless of who's doing the watering.

### 3. Reduced Water Usage
Studies show automatic irrigation can reduce water usage by 30-50%.

**Savings come from:**
- No overwatering
- Reduced evaporation
- Targeted application
- Efficient timing

## Time and Convenience Benefits

### 1. Time Savings
Automatic systems eliminate daily watering chores.

**Time saved:**
- No daily watering trips
- No carrying watering cans
- No manual scheduling
- More time for other garden tasks

**For busy gardeners:** Automatic irrigation means your garden gets watered even when you're away.

### 2. Consistent Care
Plants receive water even when you're busy or forgetful.

**Benefits:**
- No missed waterings
- Consistent plant care
- Reduced plant stress
- Better growth rates

### 3. Vacation Peace of Mind
Your garden stays healthy while you're away.

**Advantages:**
- No plant babysitting needed
- Consistent care during absence
- Return to healthy garden
- No plant loss

## Plant Health Benefits

### 1. Optimal Watering Times
Automatic systems can water at the ideal time (early morning).

**Benefits:**
- Reduced disease risk
- Better water absorption
- Less evaporation
- Healthier plants

### 2. Root Zone Development
Drip irrigation encourages deep root growth.

**Advantages:**
- Stronger plants
- Better drought resistance
- Improved nutrient uptake
- More stable plants

### 3. Reduced Plant Stress
Consistent moisture levels prevent stress from drought or overwatering.

**Benefits:**
- Better flowering
- Increased fruit production
- Healthier foliage
- Reduced pest problems

## Cost Benefits

### 1. Water Bill Savings
Efficient watering reduces water costs.

**Savings:**
- 30-50% less water usage
- Lower monthly bills
- Reduced waste
- Better efficiency

### 2. Plant Replacement Savings
Healthier plants mean fewer replacements.

**Benefits:**
- Less plant loss
- Reduced replacement costs
- Better investment protection
- Higher plant value

### 3. Time Value
Time saved has monetary value.

**Calculations:**
- 15-30 minutes per day saved
- 7.5-15 hours per month
- Significant time value
- More productive garden time

## Types of Automatic Irrigation

### 1. Drip Irrigation
**Best for:** Vegetable gardens, flower beds, trees
**Advantages:**
- Most water efficient
- Direct root watering
- Easy to install
- Low maintenance

### 2. Soaker Hoses
**Best for:** Row crops, flower beds
**Advantages:**
- Simple installation
- Cost effective
- Good coverage
- Easy to customize

### 3. Sprinkler Systems
**Best for:** Lawns, large areas
**Advantages:**
- Wide coverage
- Good for grass
- Easy to adjust
- Professional appearance

### 4. Smart Irrigation Controllers
**Best for:** All systems
**Advantages:**
- Weather-based adjustments
- Remote control
- Water usage tracking
- Optimal timing

## Installation Considerations

### 1. System Design
**Planning factors:**
- Garden layout
- Plant water needs
- Soil type
- Climate conditions

### 2. Water Source
**Requirements:**
- Adequate water pressure
- Reliable water supply
- Proper filtration
- Backflow prevention

### 3. Maintenance Needs
**Regular tasks:**
- Filter cleaning
- Emitter checking
- Timer programming
- Seasonal adjustments

## Smart Irrigation Features

### 1. Weather Integration
Systems that adjust based on weather conditions.

**Benefits:**
- Skip watering on rainy days
- Adjust for temperature
- Respond to humidity
- Optimize water usage

### 2. Remote Control
Control your system from anywhere.

**Features:**
- Smartphone apps
- Remote programming
- Usage monitoring
- Alert notifications

### 3. Water Usage Tracking
Monitor and optimize water consumption.

**Data provided:**
- Daily usage reports
- Efficiency metrics
- Cost calculations
- Conservation tips

## Environmental Benefits

### 1. Water Conservation
Automatic systems use water more efficiently.

**Impact:**
- Reduced water waste
- Better resource management
- Environmental responsibility
- Community water savings

### 2. Reduced Runoff
Targeted watering prevents water runoff.

**Benefits:**
- No fertilizer runoff
- Reduced soil erosion
- Better water quality
- Environmental protection

### 3. Sustainable Gardening
Automatic irrigation supports sustainable practices.

**Contributions:**
- Efficient resource use
- Reduced environmental impact
- Better plant health
- Sustainable practices

## Making the Transition

### 1. Start Small
Begin with a simple system for one area.

**Recommendations:**
- Start with drip irrigation
- Choose one garden bed
- Learn the basics
- Expand gradually

### 2. Research Options
Understand different system types.

**Consider:**
- Your garden size
- Plant types
- Budget constraints
- Maintenance ability

### 3. Professional Help
Consider professional installation for complex systems.

**When to hire:**
- Large properties
- Complex layouts
- Smart systems
- Limited DIY skills

## Cost-Benefit Analysis

### Initial Investment
**Typical costs:**
- Basic drip system: $50-200
- Smart controller: $100-300
- Professional installation: $500-2000
- System expansion: $100-500

### Long-term Savings
**Annual benefits:**
- Water bill reduction: $100-300
- Time savings: 50-100 hours
- Plant replacement savings: $50-200
- Property value increase: $1000-5000

### Payback Period
**Typical timeline:**
- Basic systems: 1-2 years
- Smart systems: 2-3 years
- Professional systems: 3-5 years
- Long-term value: Ongoing

## Conclusion

Automatic irrigation systems offer significant advantages over hand watering, including water conservation, time savings, improved plant health, and cost benefits. While the initial investment may seem high, the long-term benefits make automatic irrigation a smart choice for serious gardeners.

The key is choosing the right system for your specific needs and garden layout. Start small, learn the basics, and gradually expand your system as you become more comfortable with automatic irrigation.

Remember, the best irrigation system is one that you'll actually use and maintain. Choose a system that fits your lifestyle, budget, and gardening goals for the best results.
    `
    }
];

/**
 * Upload image to Google Cloud Storage
 * @param {string} imagePath - Path to the image file
 * @param {string} fileName - Name for the file in cloud storage
 * @returns {Promise<string>} Cloud storage URL
 */
async function uploadImageToCloud(imagePath, fileName) {
    try {
        console.log(`📤 Uploading image: ${fileName}`);

        // Read the image file
        const imageBuffer = fs.readFileSync(imagePath);

        // Convert to base64 for the upload function
        const base64Image = imageBuffer.toString('base64');

        // Upload to Google Cloud Storage
        const cloudUrl = await googleCloudStorage.uploadBase64Image(
            `data:image/jpeg;base64,${base64Image}`,
            `articles/${fileName}`
        );

        console.log(`✅ Image uploaded successfully: ${fileName}`);
        return cloudUrl;
    } catch (error) {
        console.error(`❌ Error uploading image ${fileName}:`, error);
        throw error;
    }
}

/**
 * Migrate articles to database
 */
async function migrateArticles() {
    try {
        console.log('🚀 Starting article migration...');

        // Check if articles table exists
        const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'articles'
      );
    `);

        if (!tableCheck.rows[0].exists) {
            console.log('❌ Articles table does not exist. Please run setup-articles-table.js first.');
            return;
        }

        // Check if articles already exist
        const existingArticlesCheck = await pool.query('SELECT COUNT(*) as count FROM articles');
        if (existingArticlesCheck.rows[0].count > 0) {
            console.log('⚠️ Articles already exist in database. Skipping migration.');
            return;
        }

        console.log('📚 Migrating articles to database...');

        for (const article of existingArticles) {
            try {
                // Upload image to Google Cloud Storage
                const imagePath = path.join(__dirname, '../../client/assets/images/articles', article.imageFileName);

                if (!fs.existsSync(imagePath)) {
                    console.log(`⚠️ Image file not found: ${imagePath}`);
                    continue;
                }

                const cloudImageUrl = await uploadImageToCloud(imagePath, article.imageFileName);

                // Insert article into database
                const result = await pool.query(`
          INSERT INTO articles (
            title, 
            description, 
            category, 
            read_time, 
            image_url, 
            content
          ) VALUES ($1, $2, $3, $4, $5, $6) 
          RETURNING article_id
        `, [
                    article.title,
                    article.description,
                    article.category,
                    article.readTime,
                    cloudImageUrl,
                    article.content
                ]);

                console.log(`✅ Article migrated: ${article.title} (ID: ${result.rows[0].article_id})`);

            } catch (error) {
                console.error(`❌ Error migrating article ${article.title}:`, error);
            }
        }

        console.log('🎉 Article migration completed!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    migrateArticles();
}

module.exports = { migrateArticles };
