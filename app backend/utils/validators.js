const { Country, City } = require('country-state-city');

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidCountryAndCity(countryName, cityName) {
  const country = Country.getAllCountries().find(c => c.name === countryName);
  if (!country) return false;
  const cities = City.getCitiesOfCountry(country.isoCode);
  return cities.some(city => city.name === cityName);
}

module.exports = {
    isValidEmail,
    isValidCountryAndCity
}; 
  
  