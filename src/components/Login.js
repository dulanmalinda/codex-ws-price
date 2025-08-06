import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    // Check credentials against environment variables
    const validUsername = process.env.REACT_APP_USERNAME;
    const validPassword = process.env.REACT_APP_PASSWORD;

    // Debug logging
    console.log('Login Debug:', {
      enteredUsername: username,
      enteredPassword: password,
      envUsername: validUsername,
      envPassword: validPassword,
      usernameMatch: username === validUsername,
      passwordMatch: password === validPassword
    });

    if (username === validUsername && password === validPassword) {
      onLogin(true);
    } else {
      setError('Invalid username or password');
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="login-form">
          <h2>Login Required</h2>
          <p>Please enter your credentials to access the Token Tracker</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error">{error}</div>}

            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;