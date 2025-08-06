import React, { useState, useEffect } from 'react';
import { sdk } from '../lib/codex-sdk';

const TokenForm = ({ onSubmit }) => {
  const [tokenAddress, setTokenAddress] = useState('');
  const [networkId, setNetworkId] = useState('');
  const [networks, setNetworks] = useState([]);
  const [filteredNetworks, setFilteredNetworks] = useState([]);
  const [networkSearch, setNetworkSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadNetworks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.network-search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadNetworks = async () => {
    try {
      const response = await sdk.send(`
        query GetNetworks {
          getNetworks {
            id
            name
          }
        }
      `, {});
      
      const networksData = response.getNetworks;
      setNetworks(networksData || []);
      setFilteredNetworks(networksData || []);
    } catch (err) {
      console.error('Failed to load networks:', err);
      const fallbackNetworks = [
        { id: 1, name: 'Ethereum' },
        { id: 56, name: 'BSC' },
        { id: 137, name: 'Polygon' }
      ];
      setNetworks(fallbackNetworks);
      setFilteredNetworks(fallbackNetworks);
    }
  };

  const handleNetworkSearch = (searchValue) => {
    setNetworkSearch(searchValue);
    setShowDropdown(true);
    
    const filtered = networks.filter(network =>
      network.name.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredNetworks(filtered);
  };

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    setNetworkId(network.id.toString());
    setNetworkSearch(network.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tokenAddress || !networkId) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await sdk.send(`
        query GetTokenInfo($address: String!, $networkId: Int!) {
          tokens(ids: [{ address: $address, networkId: $networkId }]) {
            address
            symbol
            name
            decimals
            totalSupply
            networkId
          }
        }
      `, {
        address: tokenAddress,
        networkId: parseInt(networkId)
      });

      const tokenData = response.tokens;

      if (!tokenData || tokenData.length === 0) {
        setError('Token not found on selected network');
        setLoading(false);
        return;
      }

      onSubmit({
        address: tokenAddress,
        networkId: parseInt(networkId),
        tokenInfo: tokenData[0]
      });
    } catch (err) {
      setError('Failed to validate token: ' + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="token-form">
      <h2>Real-Time Token Tracker</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Token Address:</label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Blockchain Network:</label>
          <div className="network-search-container">
            <input
              type="text"
              value={networkSearch}
              onChange={(e) => handleNetworkSearch(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search networks..."
              disabled={loading}
            />
            {showDropdown && filteredNetworks.length > 0 && (
              <div className="network-dropdown">
                {filteredNetworks.map((network) => (
                  <div
                    key={network.id}
                    className="network-option"
                    onClick={() => handleNetworkSelect(network)}
                  >
                    {network.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Start Tracking'}
        </button>
      </form>
    </div>
  );
};

export default TokenForm;