/**
 * Location Service - Countries and Cities utilities
 *
 * Wraps country-state-city package with caching and sane fallbacks
 * to provide sorted countries list and cities per country.
 */
import { Country, State, City } from 'country-state-city';

class LocationService {
  constructor() {
    this.countriesCache = null;
    this.citiesCache = {};
  }

  // Get all countries
  getCountries() {
    if (this.countriesCache) {
      return this.countriesCache;
    }

    try {
      const countries = Country.getAllCountries();
      const sortedCountries = countries
        .map(country => ({
          name: country.name,
          code: country.isoCode,
          phoneCode: country.phonecode
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      this.countriesCache = sortedCountries;
      return sortedCountries;
    } catch (error) {
      console.error('Error getting countries:', error);
      // Fallback to basic list
      return [
        { name: 'United States', code: 'US', phoneCode: '1' },
        { name: 'Canada', code: 'CA', phoneCode: '1' },
        { name: 'United Kingdom', code: 'GB', phoneCode: '44' },
        { name: 'Germany', code: 'DE', phoneCode: '49' },
        { name: 'France', code: 'FR', phoneCode: '33' },
        { name: 'Spain', code: 'ES', phoneCode: '34' },
        { name: 'Italy', code: 'IT', phoneCode: '39' },
        { name: 'Australia', code: 'AU', phoneCode: '61' },
        { name: 'Japan', code: 'JP', phoneCode: '81' },
        { name: 'Brazil', code: 'BR', phoneCode: '55' },
        { name: 'India', code: 'IN', phoneCode: '91' },
        { name: 'China', code: 'CN', phoneCode: '86' },
        { name: 'Mexico', code: 'MX', phoneCode: '52' },
        { name: 'South Africa', code: 'ZA', phoneCode: '27' },
        { name: 'Netherlands', code: 'NL', phoneCode: '31' },
        { name: 'Sweden', code: 'SE', phoneCode: '46' }
      ];
    }
  }

  // Get cities for a specific country
  getCitiesForCountry(countryName) {
    if (this.citiesCache[countryName]) {
      return this.citiesCache[countryName];
    }

    try {
      const country = Country.getAllCountries().find(c => c.name === countryName);
      if (!country) {
        return this.getFallbackCities(countryName);
      }

      const states = State.getStatesOfCountry(country.isoCode);
      let allCities = [];
      states.forEach(state => {
        const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
        allCities = allCities.concat(cities.map(city => city.name));
      });

      const uniqueCities = [...new Set(allCities)].sort();

      this.citiesCache[countryName] = uniqueCities;
      return uniqueCities;
    } catch (error) {
      console.error('Error getting cities for country:', countryName, error);
      return this.getFallbackCities(countryName);
    }
  }

  // Get states for a specific country (if you want to add state selection)
  getStatesForCountry(countryName) {
    try {
      const country = Country.getAllCountries().find(c => c.name === countryName);
      if (!country) {
        return [];
      }

      const states = State.getStatesOfCountry(country.isoCode);
      return states
        .map(state => ({
          name: state.name,
          code: state.isoCode
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error getting states for country:', countryName, error);
      return [];
    }
  }

  // Fallback cities for common countries (if package fails)
  getFallbackCities(countryName) {
    const fallbackCities = {
      'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
      'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'],
      'United Kingdom': ['London', 'Birmingham', 'Leeds', 'Glasgow', 'Sheffield', 'Bradford', 'Edinburgh', 'Liverpool', 'Manchester', 'Bristol'],
      'Germany': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig'],
      'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
      'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao'],
      'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania'],
      'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle', 'Canberra', 'Sunshine Coast', 'Wollongong'],
      'Japan': ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama'],
      'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre'],
      'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Surat', 'Jaipur'],
      'China': ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Tianjin', 'Chongqing', 'Chengdu', 'Nanjing', 'Wuhan', 'Xi\'an'],
      'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Ciudad Juárez', 'León', 'Zapopan', 'Nezahualcóyotl', 'Ecatepec'],
      'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Kimberley', 'Nelspruit', 'Polokwane'],
      'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen'],
      'Sweden': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping']
    };

    return fallbackCities[countryName] || ['Capital City', 'Major City 1', 'Major City 2'];
  }

  // Clear cache (useful for testing or refreshing data)
  clearCache() {
    this.countriesCache = null;
    this.citiesCache = {};
  }
}

export default new LocationService(); 