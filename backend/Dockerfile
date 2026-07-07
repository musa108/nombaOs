FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Ensure Prisma schema is available for postinstall hooks that run `prisma generate`
COPY prisma ./prisma
RUN npm ci || npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
# Copy Prisma schema + generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main"]
