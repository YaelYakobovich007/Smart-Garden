const users = new Map()

function createUser(email, hashedPassword) {
    if (users.has(email)) return false;
    users.set(email, { email, password: hashedPassword });
    return true;
  }
  
  function getUser(email) {
    return users.get(email);
  }
  
  module.exports = {
    createUser,
    getUser,
  };