FROM python:3.11-slim

WORKDIR /app

# Whale injects the unique flag via the FLAG environment variable
ENV FLAG="XploitXβ{default_test_flag}"

COPY server.py /app/server.py

# Write startup script that writes dynamic FLAG to /flag
RUN echo '#!/bin/sh\necho "$FLAG" > /flag\nchmod 444 /flag\npython /app/server.py' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]
