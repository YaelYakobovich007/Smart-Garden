const users = new Map()

function createUser(email, hashedPassword, fullName, country, city) {
    if (users.has(email)) return false;
    users.set(email, { email, password: hashedPassword, fullName, country, city });
    return true;
  }
  
  function getUser(email) {
    return users.get(email);
  }
  
  module.exports = {
    createUser,
    getUser,
  };