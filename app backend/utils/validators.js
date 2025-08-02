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

function isValidName(name) {
  // Name should be 2-50 characters, letters, spaces, hyphens, and apostrophes only
  return /^[a-zA-Z\s\-']{2,50}$/.test(name.trim());
}

function isValidPassword(password) {
  // Password should be at least 8 characters with at least one letter and one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

function isValidLocation(country, city) {
  return country && city && country.trim().length > 0 && city.trim().length > 0;
}

module.exports = {
  isValidEmail,
  isValidCountryAndCity,
  isValidName,
  isValidPassword,
  isValidLocation
};

