/* RAJ LIVE PRICEBOOK V45 - connection settings.
   Keep secrets on the server. Do NOT place ERP/API passwords or tokens in this file. */
window.RAJ_V45_CONFIG = Object.assign({
  VERSION: 'V82',
  ORDER_WHATSAPP: '917046533330',             // Example India number without + : 9198XXXXXXXX
  LIVE_API_BASE: '',              // Example: https://api.yourdomain.com
  LIVE_PRODUCTS_ENDPOINT: '/api/products',
  LOGIN_ENDPOINT: '/api/auth/login',
  VEHICLE_ENDPOINT: '/api/vehicle-search',
  IMAGE_SEARCH_ENDPOINT: '/api/image-search',
  API_TIMEOUT_MS: 12000
}, window.RAJ_V45_CONFIG || {});
