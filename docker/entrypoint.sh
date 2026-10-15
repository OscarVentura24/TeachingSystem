#!/bin/sh
set -e

# Configure port for Railway dynamic $PORT
PORT="${PORT:-80}"
echo "==> Configuring Nginx to listen on port ${PORT}..."
sed -i "s/listen [0-9]*;/listen ${PORT};/g" /etc/nginx/http.d/default.conf

# Ensure storage permissions
mkdir -p /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/framework/cache \
         /var/www/html/bootstrap/cache

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Production optimizations & migrations
if [ "$APP_ENV" = "production" ]; then
    echo "==> Caching configuration and routes for production..."
    php artisan storage:link --force || true
    php artisan config:cache || true
    php artisan route:cache || true
    php artisan view:cache || true
fi

if [ -n "$DATABASE_URL" ] || [ -n "$DB_HOST" ]; then
    echo "==> Running database migrations..."
    php artisan migrate --force || true
fi

echo "==> Starting PHP-FPM..."
php-fpm -D

echo "==> Starting Nginx on port ${PORT}..."
exec nginx -g "daemon off;"
