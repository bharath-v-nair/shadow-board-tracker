export const environment = {
  production: false,
  // apiUrl: 'http://localhost:5029/api',
  // apiUrl: 'http://192.168.1.2:5029/api',
  apiUrl: '/api',
  // Relative on purpose: resolves to the page origin, so it works same-origin in prod
  // (unified SPA) and through the dev proxy (proxy.conf.json forwards /hubs to :5029).
  hubUrl: '/hubs/incidents'
};
