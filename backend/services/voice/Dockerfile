FROM node

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY services/voice/package*.json ./services/voice/
RUN cd services/voice && npm ci --omit=dev

COPY services/voice ./services/voice
COPY shared ./shared

WORKDIR /app/services/voice

EXPOSE 8005

CMD ["npm","start"]
