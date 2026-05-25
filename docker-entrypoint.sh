#!/bin/sh

# Generate env.js with current environment variables
echo "window.env = {" > /usr/share/nginx/html/env.js
echo "  VITE_KINDE_CLIENT_ID: '${VITE_KINDE_CLIENT_ID}'," >> /usr/share/nginx/html/env.js
echo "  VITE_KINDE_DOMAIN: '${VITE_KINDE_DOMAIN}'," >> /usr/share/nginx/html/env.js
echo "  VITE_KINDE_REDIRECT_URI: '${VITE_KINDE_REDIRECT_URI}'," >> /usr/share/nginx/html/env.js
echo "  VITE_KINDE_LOGOUT_REDIRECT_URI: '${VITE_KINDE_LOGOUT_REDIRECT_URI}'," >> /usr/share/nginx/html/env.js
echo "  VITE_API_BASE_URL: '${VITE_API_BASE_URL}'," >> /usr/share/nginx/html/env.js
echo "  VITE_WS_URL: '${VITE_WS_URL}'," >> /usr/share/nginx/html/env.js
echo "  VITE_KINDE_INSECURE_REFRESH: '${VITE_KINDE_INSECURE_REFRESH}'" >> /usr/share/nginx/html/env.js
echo "};" >> /usr/share/nginx/html/env.js

# Execute Nginx (the CMD from Dockerfile)
exec "$@"
