import React, { useState, useEffect, useRef } from 'react';

const TokenDisplay = ({ tokenData }) => {
  const [priceData, setPriceData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const wsRef = useRef(null);
  const subscriptionIdRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    if (tokenData) {
      startSubscription();
    }

    return () => {
      stopSubscription();
    };
  }, [tokenData]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSubscription = () => {
    try {
      setConnectionStatus('connecting');
      setError('');

      const ws = new WebSocket('wss://graph.codex.io/graphql', 'graphql-transport-ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket opened');
        
        // Set connection timeout
        connectionTimeoutRef.current = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING || connectionStatus !== 'connected') {
            console.log('Connection timeout - closing WebSocket');
            ws.close();
            setError('Connection timeout - server did not respond');
            setConnectionStatus('error');
          }
        }, 10000); // 10 second timeout
        
        ws.send(JSON.stringify({
          type: 'connection_init',
          payload: {
            Authorization: process.env.REACT_APP_CODEX_API_KEY
          }
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('WebSocket message:', message);

        switch (message.type) {
          case 'connection_ack':
            console.log('Connection acknowledged');
            
            // Clear connection timeout
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            
            const subscriptionId = `price_${tokenData.address}_${tokenData.networkId}`;
            subscriptionIdRef.current = subscriptionId;
            
            // Send subscription immediately after acknowledgment
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  id: subscriptionId,
                  type: 'subscribe',
                  payload: {
                    query: `
                      subscription OnPriceUpdated($address: String!, $networkId: Int!) {
                        onPriceUpdated(address: $address, networkId: $networkId) {
                          priceUsd
                          timestamp
                          address
                        }
                      }
                    `,
                    variables: {
                      address: tokenData.address,
                      networkId: tokenData.networkId
                    }
                  }
                }));
                console.log('Subscription sent');
              }
            }, 100); // Small delay to ensure connection is stable
            break;

          case 'next':
            if (message.payload?.data?.onPriceUpdated) {
              setPriceData(message.payload.data.onPriceUpdated);
              setConnectionStatus('connected');
              setError(''); // Clear any previous connection errors
              retryCountRef.current = 0; // Reset retry count on successful data
            }
            break;

          case 'error':
            console.error('Subscription error:', message.payload);
            setError(`Subscription error: ${JSON.stringify(message.payload)}`);
            setConnectionStatus('error');
            break;

          case 'complete':
            console.log('Subscription completed');
            setConnectionStatus('disconnected');
            break;

          case 'ping':
            // Respond to ping with pong
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'pong':
            // Server responded to our ping
            console.log('Received pong from server');
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error: Failed to connect to server');
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        
        // Clear timeouts
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setConnectionStatus('disconnected');
        
        // Only attempt reconnection if it wasn't a normal closure (1000) and we have token data
        if (event.code !== 1000 && tokenData && wsRef.current && retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000); // Exponential backoff, max 10s
          
          setError(`Connection lost. Reconnecting... (Attempt ${retryCountRef.current}/${maxRetries})`);
          
          // Attempt to reconnect after exponential backoff delay
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (Attempt ${retryCountRef.current}/${maxRetries})`);
            startSubscription();
          }, delay);
        } else if (event.code !== 1000) {
          if (retryCountRef.current >= maxRetries) {
            setError(`Connection failed after ${maxRetries} attempts. Please try refreshing the page.`);
            setConnectionStatus('error');
          } else {
            setError(`Connection closed unexpectedly: ${event.reason || 'Unknown reason'}`);
          }
        }
      };

    } catch (err) {
      console.error('Failed to start subscription:', err);
      setError(`Failed to start subscription: ${err.message || 'Unknown error'}`);
      setConnectionStatus('error');
    }
  };

  const stopSubscription = () => {
    // Clear all timeouts
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset retry count
    retryCountRef.current = 0;
    
    // Send complete message for active subscription
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && subscriptionIdRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'complete',
        id: subscriptionIdRef.current
      }));
    }
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'User stopped tracking');
      wsRef.current = null;
    }
    
    subscriptionIdRef.current = null;
    setConnectionStatus('disconnected');
    setError('');
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatMarketCap = (price, supply) => {
    if (!price || !supply) return 'N/A';
    const marketCap = price * supply;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(marketCap);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (!tokenData) return null;

  return (
    <div className="token-display">
      <div className="connection-status" style={{ color: getStatusColor() }}>
        Status: {connectionStatus}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="token-info">
        <h3>{tokenData.tokenInfo?.symbol || 'Token'}</h3>
        <p>Address: {tokenData.address}</p>
        <p>Network ID: {tokenData.networkId}</p>
      </div>

      <div className="price-data">
        <div className="price-item">
          <h4>Current Price</h4>
          <div className="price-value">
            {formatPrice(priceData?.priceUsd)}
          </div>
        </div>

        <div className="price-item">
          <h4>Market Cap</h4>
          <div className="market-cap-value">
            {formatMarketCap(
              priceData?.priceUsd,
              tokenData.tokenInfo?.totalSupply
            )}
          </div>
        </div>

        {priceData?.timestamp && (
          <div className="timestamp">
            Last updated: {new Date(priceData.timestamp * 1000).toLocaleString()}
          </div>
        )}
      </div>

    </div>
  );
};

export default TokenDisplay;