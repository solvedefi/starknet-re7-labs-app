FROM node:20 

RUN corepack enable

WORKDIR /app

COPY package.json yarn.lock ./
COPY ./prisma ./prisma
RUN yarn install

COPY ./src ./src
COPY ./next.config.mjs ./next.config.mjs
COPY ./tsconfig.json ./tsconfig.json
COPY ./public ./public
COPY ./.env.local ./.env.local

RUN yarn build


# COPY --from=builder --chown=nextjs:nodejs /app/.next/ ./.next
# COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# COPY --from=builder --chown=nextjs:nodejs /app/yarn.lock ./yarn.lock

EXPOSE 3000
