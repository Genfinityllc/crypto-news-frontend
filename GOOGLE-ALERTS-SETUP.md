# Google Alerts RSS Setup for Client News

## Step 1: Create Google Alerts

Visit https://www.google.com/alerts and create alerts for these client keywords:

### Hedera Keywords:
- `Hedera OR HBAR OR "Hedera Hashgraph"`
- `"Hedera Network" OR "HBAR token" OR "HBAR price"`
- `"Hedera Council" OR "Hedera DeFi"`

### XDC Keywords:
- `XDC OR "XDC Network" OR "XinFin"`
- `"XDC token" OR "XDC price"`

### Algorand Keywords:
- `Algorand OR ALGO OR "Algorand Foundation"`
- `"ALGO token" OR "ALGO price"`

### Constellation Keywords:
- `"Constellation Network" OR "Constellation Labs"`
- `DAG OR "$DAG" OR "DAG token"`

### HashPack Keywords:
- `HashPack OR "HashPack wallet"`
- `"PACK token" OR "$PACK"`

### Additional Terms:
- `SWAP OR "$SWAP" cryptocurrency`

## Step 2: Configure Alert Settings

For each alert:
1. **Frequency**: As-it-happens (for real-time) or Daily
2. **Sources**: News
3. **Language**: English
4. **Region**: United States
5. **How many**: Only the best results
6. **Deliver to**: RSS feed

## Step 3: Get RSS URLs

After creating each alert, Google will provide RSS URLs like:
```
https://www.google.com/alerts/feeds/[UNIQUE_ID]/[USER_ID]
```

## Step 4: Add to Backend

Add these RSS URLs to your backend RSS feed configuration. The URLs will look like:

```javascript
const clientRSSFeeds = [
  'https://www.google.com/alerts/feeds/12345678901234567890/67890123456789012345',  // Hedera alerts
  'https://www.google.com/alerts/feeds/12345678901234567891/67890123456789012345',  // XDC alerts
  'https://www.google.com/alerts/feeds/12345678901234567892/67890123456789012345',  // Algorand alerts
  'https://www.google.com/alerts/feeds/12345678901234567893/67890123456789012345',  // Constellation alerts
  'https://www.google.com/alerts/feeds/12345678901234567894/67890123456789012345',  // HashPack alerts
];
```

## Alternative: Single Comprehensive Alert

You can also create one comprehensive alert with all terms:
```
(Hedera OR HBAR OR "Hedera Hashgraph") OR (XDC OR "XDC Network" OR XinFin) OR (Algorand OR ALGO) OR ("Constellation Network" OR DAG) OR (HashPack OR "PACK token") OR (SWAP cryptocurrency)
```

## Benefits:
- ✅ Real-time news alerts for all client keywords
- ✅ RSS feeds that update automatically
- ✅ Free service from Google
- ✅ Comprehensive coverage of crypto news sources
- ✅ Easy to manage and update keywords