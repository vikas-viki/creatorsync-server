FROM node:22-slim AS builder

WORKDIR /app

COPY package.json ./package.json 
COPY pnpm-lock.yaml ./pnpm-lock.yaml

RUN npm i -g pnpm
RUN pnpm install --prod --frozen-lockfile
RUN pnpm approve-builds @prisma/client

COPY . .

RUN npm run prisma:generate
ENV NODE_ENV=production
RUN npm run build

FROM node:22-slim AS runner 

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
CMD ["/app/entrypoint.sh"]