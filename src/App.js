import React, { useState } from 'react';
import './App.css';
import TokenForm from './components/TokenForm';
import TokenDisplay from './components/TokenDisplay';
import Login from './components/Login';

function App() {
  const [tokenData, setTokenData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleTokenSubmit = (data) => {
    setTokenData(data);
  };

  const handleReset = () => {
    setTokenData(null);
  };

  const handleLogin = (authenticated) => {
    setIsAuthenticated(authenticated);
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Show main app if authenticated
  return (
    <div className="App">
      <div className="container">
        {!tokenData ? (
          <TokenForm onSubmit={handleTokenSubmit} />
        ) : (
          <>
            <TokenDisplay tokenData={tokenData} />
            <button onClick={handleReset} className="reset-button">
              Track New Token
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
