FROM node:bullseye

WORKDIR /server

COPY ./package.json ./

RUN npm i

RUN apt-get update && apt-get install curl gnupg -y \
    && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install google-chrome-stable -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN npm install pm2 -g

RUN apt update -y && apt install nginx -y

COPY ./ ./

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 4000 80

CMD [ "sh", "-c","nginx && pm2-runtime npm -- start" ]
