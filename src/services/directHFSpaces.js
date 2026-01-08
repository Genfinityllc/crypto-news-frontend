/**
 * Direct HF Spaces LoRA Service - Bypass Backend
 * Calls HF Spaces directly from frontend while Railway is down
 */

// Use working backend proxy - Universal LoRA is confirmed working!
const BACKEND_URL = 'https://crypto-news-curator-backend-production.up.railway.app/api/ai-cover';

export const generateImageDirectly = async (article) => {
  try {
    console.log('🚀 ULTRA-DEBUG: Calling backend proxy:', {
      articleTitle: article?.title,
      articleExists: !!article,
      backendUrl: BACKEND_URL
    });
    
    // Validate input
    if (!article) {
      throw new Error('Article is null/undefined');
    }
    
    if (!article.title) {
      throw new Error('Article title is required');
    }
    
    // Detect client from article - COMPREHENSIVE CRYPTO DETECTION
    const detectClient = (article) => {
      const title = (article.title || '').toLowerCase();
      const content = (article.content || article.summary || '').toLowerCase();
      const network = (article.network || '').toLowerCase();
      const fullText = `${title} ${content} ${network}`;
      
      // Priority detection for major cryptos
      if (fullText.includes('ripple') || fullText.includes('xrp')) return 'ripple';
      if (fullText.includes('hedera') || fullText.includes('hbar') || fullText.includes('hashgraph')) return 'hedera';
      if (fullText.includes('solana') || fullText.includes('sol ')) return 'solana';
      if (fullText.includes('cardano') || fullText.includes('ada ')) return 'cardano';
      if (fullText.includes('ethereum') || fullText.includes('eth ') || fullText.includes('ether')) return 'ethereum';
      if (fullText.includes('bitcoin') || fullText.includes('btc ')) return 'bitcoin';
      if (fullText.includes('algorand') || fullText.includes('algo ')) return 'algorand';
      if (fullText.includes('polygon') || fullText.includes('matic')) return 'polygon';
      if (fullText.includes('avalanche') || fullText.includes('avax')) return 'avalanche';
      if (fullText.includes('chainlink') || fullText.includes('link ')) return 'chainlink';
      if (fullText.includes('polkadot') || fullText.includes('dot ')) return 'polkadot';
      if (fullText.includes('constellation') || fullText.includes('dag ')) return 'constellation';
      
      return 'generic'; // No specific crypto detected
    };
    
    // Select style based on content
    const selectStyle = (article) => {
      const title = (article.title || '').toLowerCase();
      
      if (title.includes('institutional') || title.includes('enterprise')) return 'corporate_style';
      if (title.includes('innovation') || title.includes('breakthrough')) return 'energy_fields';
      if (title.includes('network') || title.includes('protocol')) return 'network_nodes';
      if (title.includes('defi') || title.includes('trading')) return 'particle_waves';
      if (title.includes('launch') || title.includes('announcement')) return 'ultra_visible';
      
      // Random selection from available styles
      const styles = ['energy_fields', 'network_nodes', 'particle_waves', 'corporate_style', 'ultra_visible', 'dark_theme'];
      return styles[Math.floor(Math.random() * styles.length)];
    };
    
    const client = detectClient(article);
    const style = selectStyle(article);
    
    // Generate smart subtitle based on detected crypto - NO GENERIC SUBTITLES!
    const generateSmartSubtitle = (detectedClient, articleTitle) => {
      const title = (articleTitle || '').toLowerCase();
      
      // If we detected a specific crypto, create relevant subtitle
      if (detectedClient !== 'generic') {
        const cryptoNames = {
          'ripple': 'XRP',
          'hedera': 'HBAR', 
          'solana': 'SOL',
          'cardano': 'ADA',
          'ethereum': 'ETH',
          'bitcoin': 'BTC',
          'algorand': 'ALGO',
          'polygon': 'MATIC',
          'avalanche': 'AVAX',
          'chainlink': 'LINK',
          'polkadot': 'DOT',
          'constellation': 'DAG'
        };
        
        const cryptoSymbol = cryptoNames[detectedClient] || detectedClient.toUpperCase();
        
        // Create relevant subtitle based on article content
        if (title.includes('price') || title.includes('surge') || title.includes('rally')) {
          return `${cryptoSymbol} Market Update`;
        } else if (title.includes('partnership') || title.includes('collaboration')) {
          return `${cryptoSymbol} Partnership News`;
        } else if (title.includes('update') || title.includes('upgrade') || title.includes('development')) {
          return `${cryptoSymbol} Development`;
        } else if (title.includes('launch') || title.includes('announcement')) {
          return `${cryptoSymbol} Launch News`;
        } else {
          return `${cryptoSymbol} Analysis`;
        }
      }
      
      // For generic, return empty string to skip subtitle
      return '';
    };
    
    const subtitle = generateSmartSubtitle(client, article.title);
    
    console.log(`🎨 ULTRA-DEBUG: Generated parameters:`, {
      client,
      style, 
      subtitle,
      title: article.title
    });
    
    const requestBody = {
      title: article.title,
      subtitle: subtitle,
      client_id: client,  // Use client_id for backend compatibility
      style: style
    };
    
    console.log('📡 ULTRA-DEBUG: Making fetch request to:', `https://crypto-news-curator-backend-production.up.railway.app/api/news/generate-lora-image`);
    console.log('📦 ULTRA-DEBUG: Request body:', requestBody);
    
    // Call backend LoRA service (which calls HF Spaces)
    const response = await fetch(`https://crypto-news-curator-backend-production.up.railway.app/api/news/generate-lora-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 ULTRA-DEBUG: Fetch response status:', response.status);
    console.log('📥 ULTRA-DEBUG: Response ok:', response.ok);
    console.log('📥 ULTRA-DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ULTRA-DEBUG: Backend HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      throw new Error(`Backend HTTP error: ${response.status} - ${errorText}`);
    }
    
    console.log('📦 ULTRA-DEBUG: Parsing JSON response...');
    const result = await response.json();
    
    console.log('📋 ULTRA-DEBUG: Parsed response:', {
      success: result?.success,
      hasImageUrl: !!result?.image_url,
      hasCoverImage: !!result?.data?.coverImage,
      imageUrl: result?.image_url,
      coverImage: result?.data?.coverImage,
      error: result?.error,
      metadata: result?.metadata,
      fullResult: result
    });
    
    // Handle both response formats: new format with image_url and current format with data.coverImage
    const imageUrl = result.image_url || result.data?.coverImage;
    
    if (result.success && imageUrl) {
      console.log('✅ ULTRA-DEBUG: Backend generation successful!');
      console.log('🔍 ULTRA-DEBUG: Generation method:', result.metadata?.generation_method || result.data?.generationMethod);
      
      const successResponse = {
        success: true,
        coverUrl: imageUrl,
        generationMethod: result.metadata?.generation_method || result.data?.generationMethod || 'backend_proxy',
        clientId: client,
        style: style,
        metadata: result.metadata || result.data
      };
      
      console.log('🎁 ULTRA-DEBUG: Returning success response:', successResponse);
      return successResponse;
    } else {
      const errorMsg = result.error || 'Backend proxy generation failed - no image URL returned';
      console.error('❌ ULTRA-DEBUG: Generation failed in response:', errorMsg);
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    console.error('❌ ULTRA-DEBUG: Backend proxy call failed:', {
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: error.constructor.name,
      articleTitle: article?.title,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const checkHFSpacesStatus = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/status`);
    const status = await response.json();
    
    console.log('🔍 Backend Status:', {
      available: status.available,
      service: status.service,
      supported_clients: status.supported_clients
    });
    
    return status;
  } catch (error) {
    console.error('❌ Could not check backend status:', error);
    return null;
  }
};