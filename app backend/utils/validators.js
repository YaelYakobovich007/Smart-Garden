/**
 * Validation utilities for emails, names, passwords and locations.
 */
const { Country, City } = require('country-state-city');

/** Validate a basic email structure */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validate that a country and city exist within the CSC dataset */
function isValidCountryAndCity(countryName, cityName) {
  const country = Country.getAllCountries().find(c => c.name === countryName);
  if (!country) return false;
  const cities = City.getCitiesOfCountry(country.isoCode);
  return cities.some(city => city.name === cityName);
}

/** Name must be 2-50 chars; letters, spaces, hyphens and apostrophes */
function isValidName(name) {
  // Name should be 2-50 characters, letters, spaces, hyphens, and apostrophes only
  return /^[a-zA-Z\s\-']{2,50}$/.test(name.trim());
}

/** Password: at least 8 chars, includes letter and number */
function isValidPassword(password) {
  // Password should be at least 8 characters with at least one letter and one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

/** Location fields must be non-empty */
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

