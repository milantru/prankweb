# Use the official Apache image
FROM httpd:2.4.63

# Copy custom Apache config file into the container
# COPY api.conf /usr/local/apache2/conf/api.conf

# Ensure the results directory exists and has correct permissions
RUN mkdir -p /results

# Expose port 80
EXPOSE 80

# Start Apache
CMD ["httpd", "-D", "FOREGROUND"]
