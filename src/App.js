import React, { useState } from 'react';
import './App.css';
import TokenForm from './components/TokenForm';
import TokenDisplay from './components/TokenDisplay';

function App() {
  const [tokenData, setTokenData] = useState(null);

  const handleTokenSubmit = (data) => {
    setTokenData(data);
  };

  const handleReset = () => {
    setTokenData(null);
  };

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
