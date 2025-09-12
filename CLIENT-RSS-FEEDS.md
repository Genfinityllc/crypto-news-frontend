# Client RSS Feeds Configuration

## Immediate RSS Feeds (Add to Backend)

### General Crypto News RSS Feeds:
```javascript
const cryptoRSSFeeds = [
  // CoinDesk - Major crypto news source
  'https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml',
  
  // Cointelegraph - Comprehensive crypto coverage
  'https://cointelegraph.com/rss',
  
  // CryptoNews - General crypto news
  'https://cryptonews.com/news/feed/',
  
  // Decrypt - Modern crypto journalism
  'https://decrypt.co/feed',
  
  // The Block - Professional crypto news
  'https://www.theblockcrypto.com/rss.xml',
  
  // CoinTelegraph specific tags (these may work for client keywords)
  'https://cointelegraph.com/tags/hedera/rss',
  'https://cointelegraph.com/tags/algorand/rss',
  'https://cointelegraph.com/tags/xdc-network/rss',
];
```

### Client-Specific RSS Sources:

#### Hedera RSS:
```javascript
// Official Hedera blog
'https://hedera.com/blog/rss.xml'

// Reddit RSS for Hedera discussions
'https://www.reddit.com/r/Hedera.rss'
'https://www.reddit.com/r/hashgraph.rss'
```

#### Algorand RSS:
```javascript
// Official Algorand blog
'https://algorand.foundation/news/rss'

// Reddit RSS for Algorand
'https://www.reddit.com/r/algorand.rss'
'https://www.reddit.com/r/AlgorandOfficial.rss'
```

#### XDC Network RSS:
```javascript
// Official XDC blog (if available)
'https://xdc.org/blog/rss' // Check if this exists

// Reddit RSS for XDC
'https://www.reddit.com/r/xinfin.rss'
```

#### Constellation RSS:
```javascript
// Reddit RSS for Constellation
'https://www.reddit.com/r/constellation.rss'
```

### Google News RSS (Alternative approach):
While Google News doesn't have a direct feed, you can use these topic-specific RSS feeds:

```javascript
// Google News Technology RSS
'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en'

// Google News Business RSS
'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en'
```

## Implementation Steps:

1. **Add to Backend RSS Configuration:**
   Add these feeds to your backend's RSS feed list

2. **Update Feed Processing:**
   Ensure your backend filters articles for client keywords:
   - Hedera, HBAR, Hedera Hashgraph
   - XDC, XDC Network, XinFin
   - Algorand, ALGO
   - Constellation, DAG
   - HashPack, PACK token
   - SWAP

3. **Testing:**
   Test each RSS feed individually to ensure they're working:
   ```bash
   curl "https://www.coindesk.com/arc/outboundfeeds/rss/?outputType=xml"
   ```

## Recommended Priority:
1. **Immediate**: Add CoinDesk, Cointelegraph, and Decrypt RSS feeds
2. **Short-term**: Set up Google Alerts RSS (see GOOGLE-ALERTS-SETUP.md)
3. **Long-term**: Add client-specific official RSS feeds as they become available