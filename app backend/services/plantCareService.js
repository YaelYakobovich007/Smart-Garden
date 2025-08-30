// Plant Care Service - Provides moisture recommendations and care tips
// This service integrates with plant identification to provide comprehensive plant care data

// Plant name mapping - maps Plant.id API names to our database keys
const plantNameMapping = {
    // Basil variations
    "sweet basil": "basil",
    "genovese basil": "basil",
    "ocimum basilicum": "basil",

    // Mint variations
    "peppermint": "mint",
    "spearmint": "mint",
    "mentha": "mint",

    // Rosemary variations
    "rosmarinus officinalis": "rosemary",

    // Thyme variations
    "thymus vulgaris": "thyme",
    "common thyme": "thyme",

    // Oregano variations
    "origanum vulgare": "oregano",

    // Parsley variations
    "petroselinum crispum": "parsley",
    "curly parsley": "parsley",

    // Tomato variations
    "solanum lycopersicum": "tomato",
    "cherry tomato": "tomato",

    // Lettuce variations
    "lactuca sativa": "lettuce",
    "iceberg lettuce": "lettuce",
    "romaine lettuce": "lettuce",

    // Cucumber variations
    "cucumis sativus": "cucumber",

    // Pepper variations
    "capsicum annuum": "pepper",
    "bell pepper": "pepper",
    "sweet pepper": "pepper",

    // Carrot variations
    "daucus carota": "carrot",

    // Rose variations
    "rosa": "rose",
    "garden rose": "rose",
    "hybrid tea rose": "rose",

    // Marigold variations
    "tagetes": "marigold",
    "tagetes erecta": "marigold",
    "african marigold": "marigold",

    // Petunia variations
    "petunia hybrida": "petunia",

    // Cyclamen variations
    "cyclamen persicum": "cyclamen",

    // Monstera variations
    "monstera deliciosa": "monstera",
    "swiss cheese plant": "monstera",

    // Sansevieria variations
    "sansevieria trifasciata": "sansevieria",
    "snake plant": "sansevieria",
    "mother-in-law's tongue": "sansevieria",

    // Pothos variations
    "epipremnum aureum": "pothos",
    "devil's ivy": "pothos",
    "golden pothos": "pothos",

    // Ficus variations
    "ficus benjamina": "ficus",
    "weeping fig": "ficus",

    // Aloe variations
    "aloe vera": "aloe",
    "aloe barbadensis": "aloe",

    // Echeveria variations
    "echeveria elegans": "echeveria",
    "mexican snowball": "echeveria",

    // Sedum variations
    "sedum acre": "sedum",
    "stonecrop": "sedum",

    // Strawberry variations
    "fragaria": "strawberry",
    "fragaria x ananassa": "strawberry",

    // Blueberry variations
    "vaccinium": "blueberry",
    "vaccinium corymbosum": "blueberry",
    "highbush blueberry": "blueberry",

    // Additional common plants
    "lavender": "lavender",
    "lavandula": "lavender",
    "sage": "sage",
    "salvia": "sage",
    "salvia officinalis": "sage",
    "chamomile": "chamomile",
    "matricaria chamomilla": "chamomile",
    "dill": "dill",
    "anethum graveolens": "dill",
    "cilantro": "cilantro",
    "coriander": "cilantro",
    "coriandrum sativum": "cilantro",
    "spinach": "spinach",
    "spinacia oleracea": "spinach",
    "kale": "kale",
    "brassica oleracea": "kale",
    "cabbage": "cabbage",
    "brassica oleracea var. capitata": "cabbage",
    "broccoli": "broccoli",
    "brassica oleracea var. italica": "broccoli",
    "cauliflower": "cauliflower",
    "brassica oleracea var. botrytis": "cauliflower",
    "onion": "onion",
    "allium cepa": "onion",
    "garlic": "garlic",
    "allium sativum": "garlic",
    "potato": "potato",
    "solanum tuberosum": "potato",
    "sweet potato": "sweet potato",
    "ipomoea batatas": "sweet potato",
    "corn": "corn",
    "maize": "corn",
    "zea mays": "corn",
    "bean": "bean",
    "phaseolus vulgaris": "bean",
    "green bean": "bean",
    "pea": "pea",
    "pisum sativum": "pea",
    "green pea": "pea",
    "radish": "radish",
    "raphanus sativus": "radish",
    "beet": "beet",
    "beetroot": "beet",
    "beta vulgaris": "beet",
    "turnip": "turnip",
    "brassica rapa": "turnip",
    "celery": "celery",
    "apium graveolens": "celery",
    "asparagus": "asparagus",
    "asparagus officinalis": "asparagus",
    "artichoke": "artichoke",
    "cynara cardunculus": "artichoke",
    "eggplant": "eggplant",
    "aubergine": "eggplant",
    "solanum melongena": "eggplant",
    "zucchini": "zucchini",
    "courgette": "zucchini",
    "cucurbita pepo": "zucchini",
    "pumpkin": "pumpkin",
    "cucurbita": "pumpkin",
    "squash": "squash",
    "butternut squash": "squash",
    "acorn squash": "squash",
    "watermelon": "watermelon",
    "citrullus lanatus": "watermelon",
    "cantaloupe": "cantaloupe",
    "cucumis melo": "cantaloupe",
    "honeydew": "cantaloupe",
    "muskmelon": "cantaloupe",
    "apple": "apple",
    "malus domestica": "apple",
    "orange": "orange",
    "citrus sinensis": "orange",
    "lemon": "lemon",
    "citrus limon": "lemon",
    "lime": "lime",
    "citrus aurantiifolia": "lime",
    "grapefruit": "grapefruit",
    "citrus paradisi": "grapefruit",
    "grape": "grape",
    "vitis vinifera": "grape",
    "peach": "peach",
    "prunus persica": "peach",
    "plum": "plum",
    "prunus domestica": "plum",
    "cherry": "cherry",
    "prunus avium": "cherry",
    "apricot": "apricot",
    "prunus armeniaca": "apricot",
    "pear": "pear",
    "pyrus": "pear",
    "pyrus communis": "pear",
    "fig": "fig",
    "ficus carica": "fig",
    "pomegranate": "pomegranate",
    "punica granatum": "pomegranate",
    "olive": "olive",
    "olea europaea": "olive",
    "almond": "almond",
    "prunus dulcis": "almond",
    "walnut": "walnut",
    "juglans": "walnut",
    "juglans regia": "walnut",
    "hazelnut": "hazelnut",
    "corylus": "hazelnut",
    "corylus avellana": "hazelnut",
    "sunflower": "sunflower",
    "helianthus annuus": "sunflower",
    "daisy": "daisy",
    "bellis perennis": "daisy",
    "dandelion": "dandelion",
    "taraxacum": "dandelion",
    "taraxacum officinale": "dandelion",
    "tulip": "tulip",
    "tulipa": "tulip",
    "lily": "lily",
    "lilium": "lily",
    "orchid": "orchid",
    "phalaenopsis": "orchid",
    "cactus": "cactus",
    "opuntia": "cactus",
    "prickly pear": "cactus",
    "jade plant": "jade plant",
    "crassula ovata": "jade plant",
    "money tree": "jade plant",
    "peace lily": "peace lily",
    "spathiphyllum": "peace lily",
    "spider plant": "spider plant",
    "chlorophytum comosum": "spider plant",
    "zz plant": "zz plant",
    "zamioculcas zamiifolia": "zz plant",
    "philodendron": "philodendron",
    "philodendron scandens": "philodendron",
    "heartleaf philodendron": "philodendron",
    "calathea": "calathea",
    "prayer plant": "calathea",
    "calathea orbifolia": "calathea",
    "calathea makoyana": "calathea",
    "peacock plant": "calathea",
    "bamboo": "bamboo",
    "bambusa": "bamboo",
    "lucky bamboo": "bamboo",
    "dracaena sanderiana": "bamboo",
    "dracaena": "dracaena",
    "dracaena marginata": "dracaena",
    "dragon tree": "dracaena",
    "yucca": "yucca",
    "yucca elephantipes": "yucca",
    "spineless yucca": "yucca",
    "palm": "palm",
    "areca palm": "palm",
    "dypsis lutescens": "palm",
    "bamboo palm": "palm",
    "parlor palm": "palm",
    "chamaedorea elegans": "palm",
    "fern": "fern",
    "boston fern": "fern",
    "nephrolepis exaltata": "fern",
    "sword fern": "fern",
    "asparagus fern": "fern",
    "asparagus setaceus": "fern",
    "ivy": "ivy",
    "english ivy": "ivy",
    "hedera helix": "ivy",
    "common ivy": "ivy",
    "wandering jew": "wandering jew",
    "tradescantia": "wandering jew",
    "tradescantia zebrina": "wandering jew",
    "inch plant": "wandering jew",
    "zebra plant": "wandering jew",
    "begonia": "begonia",
    "begonia semperflorens": "begonia",
    "wax begonia": "begonia",
    "impatiens": "impatiens",
    "impatiens walleriana": "impatiens",
    "busy lizzie": "impatiens",
    "geranium": "geranium",
    "pelargonium": "geranium",
    "pelargonium hortorum": "geranium",
    "zonal geranium": "geranium",
    "chrysanthemum": "chrysanthemum",
    "chrysanthemum morifolium": "chrysanthemum",
    "mum": "chrysanthemum",
    "dahlia": "dahlia",
    "dahlia pinnata": "dahlia",
    "zinnia": "zinnia",
    "zinnia elegans": "zinnia",
    "cosmos": "cosmos",
    "cosmos bipinnatus": "cosmos",
    "aster": "aster",
    "asteraceae": "aster",
    "coneflower": "coneflower",
    "echinacea": "coneflower",
    "echinacea purpurea": "coneflower",
    "purple coneflower": "coneflower",
    "black eyed susan": "black eyed susan",
    "rudbeckia": "black eyed susan",
    "rudbeckia hirta": "black eyed susan",
    "coreopsis": "coreopsis",
    "tickseed": "coreopsis",
    "coreopsis tinctoria": "coreopsis",
    "yarrow": "yarrow",
    "achillea": "yarrow",
    "achillea millefolium": "yarrow",
    "common yarrow": "yarrow",
    "lavender cotton": "lavender cotton",
    "santolina": "lavender cotton",
    "santolina chamaecyparissus": "lavender cotton",
    "rosemary cotton": "lavender cotton",
    "thyme leaved cotton": "lavender cotton",
    "garden cotton": "lavender cotton",
    "cotton lavender": "lavender cotton",
    "lavender cotton": "lavender cotton",
    "santolina": "lavender cotton",
    "santolina chamaecyparissus": "lavender cotton",
    "rosemary cotton": "lavender cotton",
    "thyme leaved cotton": "lavender cotton",
    "garden cotton": "lavender cotton",
    "cotton lavender": "lavender cotton"
};

// Plant care database with moisture recommendations
const plantCareDatabase = {
    // Herbs
    "basil": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist but not waterlogged. Water when top inch of soil feels dry.",
        lightNeeds: "Full sun to partial shade",
        temperature: "18-30°C",
        humidity: "Moderate to high"
    },
    "mint": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 1-2 days",
        wateringTips: "Mint loves moisture. Keep soil consistently damp, especially in hot weather.",
        lightNeeds: "Partial shade to full sun",
        temperature: "15-25°C",
        humidity: "High"
    },
    "rosemary": {
        optimalMoisture: 40,
        minMoisture: 25,
        maxMoisture: 60,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Allow soil to dry between waterings. Rosemary prefers drier conditions.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "thyme": {
        optimalMoisture: 35,
        minMoisture: 20,
        maxMoisture: 55,
        wateringFrequency: "Every 4-6 days",
        wateringTips: "Water sparingly. Let soil dry out between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low"
    },
    "oregano": {
        optimalMoisture: 45,
        minMoisture: 30,
        maxMoisture: 65,
        wateringFrequency: "Every 3-5 days",
        wateringTips: "Moderate watering. Allow top soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "parsley": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist. Don't let it dry out completely.",
        lightNeeds: "Partial shade to full sun",
        temperature: "15-25°C",
        humidity: "Moderate"
    },

    // Vegetables
    "tomato": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Deep watering is best. Keep soil consistently moist, especially during fruiting.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "lettuce": {
        optimalMoisture: 75,
        minMoisture: 60,
        maxMoisture: 90,
        wateringFrequency: "Every 1-2 days",
        wateringTips: "Keep soil consistently moist. Lettuce needs regular watering to stay crisp.",
        lightNeeds: "Partial shade to full sun",
        temperature: "15-25°C",
        humidity: "High"
    },
    "cucumber": {
        optimalMoisture: 75,
        minMoisture: 55,
        maxMoisture: 90,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Regular, deep watering. Keep soil consistently moist for best fruit production.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "High"
    },
    "pepper": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Moderate watering. Allow soil to dry slightly between waterings.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "carrot": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil evenly moist for straight root development.",
        lightNeeds: "Full sun",
        temperature: "15-25°C",
        humidity: "Moderate"
    },

    // Flowers
    "rose": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 80,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Deep watering at the base. Avoid wetting the leaves to prevent disease.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "marigold": {
        optimalMoisture: 50,
        minMoisture: 30,
        maxMoisture: 70,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Moderate watering. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "petunia": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moist but not soggy. Water at the base to avoid fungal issues.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "cyclamen": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Water from below. Keep soil consistently moist but not waterlogged.",
        lightNeeds: "Bright indirect light",
        temperature: "10-20°C",
        humidity: "High"
    },

    // Houseplants
    "monstera": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Water when top 2-3 inches of soil are dry. Likes humidity.",
        lightNeeds: "Bright indirect light",
        temperature: "18-30°C",
        humidity: "High"
    },
    "sansevieria": {
        optimalMoisture: 30,
        minMoisture: 15,
        maxMoisture: 50,
        wateringFrequency: "Every 10-14 days",
        wateringTips: "Very drought tolerant. Allow soil to dry completely between waterings.",
        lightNeeds: "Low to bright indirect light",
        temperature: "15-30°C",
        humidity: "Low"
    },
    "pothos": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 80,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Water when top inch of soil is dry. Tolerates some drought.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "Moderate"
    },
    "ficus": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Keep soil consistently moist. Don't let it dry out completely.",
        lightNeeds: "Bright indirect light",
        temperature: "18-30°C",
        humidity: "Moderate to high"
    },
    "aloe": {
        optimalMoisture: 25,
        minMoisture: 10,
        maxMoisture: 45,
        wateringFrequency: "Every 14-21 days",
        wateringTips: "Very drought tolerant. Water deeply but infrequently.",
        lightNeeds: "Bright light to full sun",
        temperature: "15-30°C",
        humidity: "Low"
    },

    // Succulents
    "echeveria": {
        optimalMoisture: 20,
        minMoisture: 10,
        maxMoisture: 40,
        wateringFrequency: "Every 14-21 days",
        wateringTips: "Water deeply but infrequently. Allow soil to dry completely between waterings.",
        lightNeeds: "Full sun to bright light",
        temperature: "15-30°C",
        humidity: "Low"
    },
    "sedum": {
        optimalMoisture: 25,
        minMoisture: 10,
        maxMoisture: 45,
        wateringFrequency: "Every 10-14 days",
        wateringTips: "Drought tolerant. Water sparingly and allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low"
    },

    // Fruits
    "strawberry": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist. Water at the base to avoid fruit rot.",
        lightNeeds: "Full sun",
        temperature: "15-25°C",
        humidity: "Moderate"
    },
    "blueberry": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil consistently moist. Blueberries prefer acidic soil.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-25°C",
        humidity: "Moderate"
    },

    // Additional herbs
    "lavender": {
        optimalMoisture: 40,
        minMoisture: 25,
        maxMoisture: 60,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings. Prefers well-draining soil.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "sage": {
        optimalMoisture: 45,
        minMoisture: 30,
        maxMoisture: 65,
        wateringFrequency: "Every 4-6 days",
        wateringTips: "Drought tolerant. Water sparingly and allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low"
    },
    "chamomile": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Don't overwater.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-25°C",
        humidity: "Moderate"
    },
    "dill": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist but not waterlogged.",
        lightNeeds: "Full sun",
        temperature: "15-25°C",
        humidity: "Moderate"
    },
    "cilantro": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist. Cilantro bolts quickly in dry conditions.",
        lightNeeds: "Partial shade to full sun",
        temperature: "15-25°C",
        humidity: "Moderate"
    },

    // Additional vegetables
    "spinach": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 1-2 days",
        wateringTips: "Keep soil consistently moist. Spinach needs regular watering to stay tender.",
        lightNeeds: "Partial shade to full sun",
        temperature: "10-25°C",
        humidity: "High"
    },
    "kale": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist. Kale is more drought tolerant than other greens.",
        lightNeeds: "Full sun to partial shade",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "cabbage": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best head formation.",
        lightNeeds: "Full sun",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "broccoli": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best head development.",
        lightNeeds: "Full sun",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "cauliflower": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best head formation.",
        lightNeeds: "Full sun",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "onion": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Reduce watering as bulbs mature.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "garlic": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Reduce watering as bulbs mature.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "potato": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil consistently moist. Avoid overwatering to prevent rot.",
        lightNeeds: "Full sun",
        temperature: "15-25°C",
        humidity: "Moderate"
    },
    "sweet potato": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Drought tolerant once established.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "corn": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist, especially during tasseling and silking.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "bean": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist but not waterlogged.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "pea": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist but not waterlogged.",
        lightNeeds: "Full sun to partial shade",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "radish": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for crisp, tender roots.",
        lightNeeds: "Full sun to partial shade",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "beet": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for tender, sweet roots.",
        lightNeeds: "Full sun to partial shade",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "turnip": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for tender roots.",
        lightNeeds: "Full sun to partial shade",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "celery": {
        optimalMoisture: 75,
        minMoisture: 55,
        maxMoisture: 90,
        wateringFrequency: "Every 1-2 days",
        wateringTips: "Keep soil consistently moist. Celery needs lots of water.",
        lightNeeds: "Partial shade to full sun",
        temperature: "15-25°C",
        humidity: "High"
    },
    "asparagus": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established plants are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "artichoke": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best bud development.",
        lightNeeds: "Full sun",
        temperature: "15-25°C",
        humidity: "Moderate"
    },
    "eggplant": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best fruit production.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "zucchini": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best fruit production.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "pumpkin": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best fruit development.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "squash": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best fruit production.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "watermelon": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best fruit development.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },
    "cantaloupe": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best fruit development.",
        lightNeeds: "Full sun",
        temperature: "20-30°C",
        humidity: "Moderate"
    },

    // Fruits
    "apple": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established trees are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "orange": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Citrus trees prefer well-draining soil.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "lemon": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Citrus trees prefer well-draining soil.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "lime": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Citrus trees prefer well-draining soil.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "grapefruit": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Citrus trees prefer well-draining soil.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "grape": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established vines are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "peach": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established trees are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "plum": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established trees are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "cherry": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established trees are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "apricot": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established trees are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "pear": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established trees are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "fig": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established trees are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "pomegranate": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "olive": {
        optimalMoisture: 45,
        minMoisture: 25,
        maxMoisture: 65,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Very drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low"
    },

    // Nuts
    "almond": {
        optimalMoisture: 50,
        minMoisture: 30,
        maxMoisture: 70,
        wateringFrequency: "Every 4-6 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "walnut": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Established trees are drought tolerant.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "hazelnut": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },

    // Flowers
    "sunflower": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Drought tolerant once established.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "daisy": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Drought tolerant once established.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "dandelion": {
        optimalMoisture: 50,
        minMoisture: 30,
        maxMoisture: 65,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "tulip": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist during growing season.",
        lightNeeds: "Full sun to partial shade",
        temperature: "10-25°C",
        humidity: "Moderate"
    },
    "lily": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist but not waterlogged.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "orchid": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Water when potting mix is dry. Avoid overwatering.",
        lightNeeds: "Bright indirect light",
        temperature: "18-30°C",
        humidity: "High"
    },

    // Cacti and Succulents
    "cactus": {
        optimalMoisture: 20,
        minMoisture: 10,
        maxMoisture: 40,
        wateringFrequency: "Every 14-21 days",
        wateringTips: "Very drought tolerant. Water deeply but infrequently.",
        lightNeeds: "Full sun to bright light",
        temperature: "15-30°C",
        humidity: "Low"
    },
    "jade plant": {
        optimalMoisture: 30,
        minMoisture: 15,
        maxMoisture: 50,
        wateringFrequency: "Every 10-14 days",
        wateringTips: "Drought tolerant. Allow soil to dry completely between waterings.",
        lightNeeds: "Bright light to full sun",
        temperature: "15-30°C",
        humidity: "Low"
    },

    // Houseplants
    "peace lily": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil consistently moist. Likes humidity.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "High"
    },
    "spider plant": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 80,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Water when top inch of soil is dry. Tolerates some drought.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "Moderate"
    },
    "zz plant": {
        optimalMoisture: 40,
        minMoisture: 20,
        maxMoisture: 60,
        wateringFrequency: "Every 10-14 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "Low to moderate"
    },
    "philodendron": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Keep soil consistently moist. Don't let it dry out completely.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "Moderate to high"
    },
    "calathea": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil consistently moist. Likes high humidity.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "High"
    },
    "bamboo": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil consistently moist. Likes humidity.",
        lightNeeds: "Bright indirect light to full sun",
        temperature: "18-30°C",
        humidity: "Moderate to high"
    },
    "dracaena": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Allow soil to dry between waterings. Drought tolerant.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "Low to moderate"
    },
    "yucca": {
        optimalMoisture: 35,
        minMoisture: 20,
        maxMoisture: 55,
        wateringFrequency: "Every 7-10 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Bright light to full sun",
        temperature: "15-30°C",
        humidity: "Low"
    },
    "palm": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil consistently moist. Likes humidity.",
        lightNeeds: "Bright indirect light to full sun",
        temperature: "18-30°C",
        humidity: "Moderate to high"
    },
    "fern": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist. Likes high humidity.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "High"
    },
    "ivy": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 80,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Water when top inch of soil is dry. Tolerates some drought.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "Moderate"
    },
    "wandering jew": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 80,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Water when top inch of soil is dry. Tolerates some drought.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "Moderate"
    },
    "begonia": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil consistently moist but not waterlogged.",
        lightNeeds: "Low to bright indirect light",
        temperature: "18-30°C",
        humidity: "Moderate to high"
    },
    "impatiens": {
        optimalMoisture: 70,
        minMoisture: 50,
        maxMoisture: 85,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist. Don't let it dry out.",
        lightNeeds: "Partial shade to full sun",
        temperature: "18-30°C",
        humidity: "Moderate to high"
    },
    "geranium": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Allow soil to dry between waterings. Drought tolerant.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "chrysanthemum": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Don't overwater.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "dahlia": {
        optimalMoisture: 65,
        minMoisture: 45,
        maxMoisture: 80,
        wateringFrequency: "Every 2-3 days",
        wateringTips: "Keep soil consistently moist for best flowering.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "zinnia": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Drought tolerant once established.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "cosmos": {
        optimalMoisture: 50,
        minMoisture: 30,
        maxMoisture: 65,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "aster": {
        optimalMoisture: 60,
        minMoisture: 40,
        maxMoisture: 75,
        wateringFrequency: "Every 3-4 days",
        wateringTips: "Keep soil moderately moist. Drought tolerant once established.",
        lightNeeds: "Full sun to partial shade",
        temperature: "15-30°C",
        humidity: "Moderate"
    },
    "coneflower": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "black eyed susan": {
        optimalMoisture: 55,
        minMoisture: 35,
        maxMoisture: 70,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "coreopsis": {
        optimalMoisture: 50,
        minMoisture: 30,
        maxMoisture: 65,
        wateringFrequency: "Every 4-5 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    },
    "yarrow": {
        optimalMoisture: 45,
        minMoisture: 25,
        maxMoisture: 60,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Very drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low"
    },
    "lavender cotton": {
        optimalMoisture: 40,
        minMoisture: 25,
        maxMoisture: 60,
        wateringFrequency: "Every 5-7 days",
        wateringTips: "Drought tolerant. Allow soil to dry between waterings.",
        lightNeeds: "Full sun",
        temperature: "15-30°C",
        humidity: "Low to moderate"
    }
};

/**
 * Normalize plant name and find the best match
 * @param {string} speciesName - The plant species name from Plant.id API
 * @returns {string} - Normalized plant name for database lookup
 */
function normalizePlantName(speciesName) {
    if (!speciesName) return null;

    const normalizedName = speciesName.toLowerCase().trim();
    console.log(`[CARE] Normalizing name: species=${speciesName} normalized=${normalizedName}`);

    // First, check if the exact name exists in our database
    if (plantCareDatabase[normalizedName]) {
        console.log(`[CARE] Exact match found: name=${normalizedName}`);
        return normalizedName;
    }

    // Check if there's a mapping for this name
    if (plantNameMapping[normalizedName]) {
        const mappedName = plantNameMapping[normalizedName];
        console.log(`[CARE] Mapped name found: original=${normalizedName} mapped=${mappedName}`);
        return mappedName;
    }

    // Try partial matching for common patterns
    for (const [apiName, dbName] of Object.entries(plantNameMapping)) {
        if (normalizedName.includes(apiName) || apiName.includes(normalizedName)) {
            console.log(`[CARE] Partial match found: original=${normalizedName} matched=${dbName}`);
            return dbName;
        }
    }

    // Try to find similar names in our database
    for (const dbName of Object.keys(plantCareDatabase)) {
        if (normalizedName.includes(dbName) || dbName.includes(normalizedName)) {
            console.log(`[CARE] Similar name found: original=${normalizedName} similar=${dbName}`);
            return dbName;
        }
    }

    console.log(`[CARE] No match found: name=${normalizedName}`);
    return null;
}

/**
 * Get plant care information by species name
 * @param {string} speciesName - The plant species name
 * @returns {Promise<Object|null>} - Plant care data or null if not found
 */
async function getPlantCare(speciesName) {
    if (!speciesName) return null;

    const normalizedName = normalizePlantName(speciesName);
    if (!normalizedName) {
        console.log(`[CARE] Error: Failed to normalize name - species=${speciesName}`);
        return null;
    }

    const careData = plantCareDatabase[normalizedName];
    if (careData) {
        console.log(`[CARE] Found data: species=${speciesName} normalized=${normalizedName}`);
        return careData;
    }

    console.log(`[CARE] No data found: species=${speciesName} normalized=${normalizedName}`);
    console.log('[CARE] Trying ChatGPT fallback');

    // Try ChatGPT as fallback
    try {
        const { getPlantCareFromChatGPT } = require('./chatgptService');
        const chatgptCareData = await getPlantCareFromChatGPT(speciesName);

        if (chatgptCareData) {
            console.log(`[CARE] ChatGPT data received: species=${speciesName}`);
            return chatgptCareData;
        }
    } catch (error) {
        console.log(`[CARE] Error: ChatGPT fallback failed - species=${speciesName} error=${error.message}`);
    }

    console.log(`[CARE] No data available: species=${speciesName}`);
    return null;
}

/**
 * Get all available plant species in the database
 * @returns {Array} - Array of plant species names
 */
function getAvailablePlantSpecies() {
    return Object.keys(plantCareDatabase);
}

/**
 * Search plants by partial name
 * @param {string} searchTerm - Search term
 * @returns {Array} - Array of matching plant species
 */
function searchPlants(searchTerm) {
    if (!searchTerm) return [];

    const normalizedSearch = searchTerm.toLowerCase().trim();
    return Object.keys(plantCareDatabase).filter(species =>
        species.includes(normalizedSearch)
    );
}

/**
 * Get comprehensive plant identification result with care data
 * @param {string} speciesName - Identified plant species
 * @param {number} probability - Identification confidence
 * @returns {Promise<Object>} - Combined identification and care data
 */
async function getPlantIdentificationWithCare(speciesName, probability) {
    const careData = await getPlantCare(speciesName);

    return {
        species: speciesName,
        probability: probability,
        careData: careData,
        hasCareData: !!careData
    };
}

module.exports = {
    getPlantCare,
    getAvailablePlantSpecies,
    searchPlants,
    getPlantIdentificationWithCare,
    normalizePlantName,
    plantCareDatabase,
    plantNameMapping
};
