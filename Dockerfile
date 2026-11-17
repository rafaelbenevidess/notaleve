# syntax=docker/dockerfile:1.7
# Imagem do app NotaLeve (Next.js standalone) e da SEFAZ simulada.
# Alvos: app | sefaz-mock.  CA extra opcional (proxy TLS): --secret id=ca,src=ca.crt
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
# Variáveis públicas são embutidas no build; os valores padrão servem para o Supabase local.
ARG NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:22-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 10001 app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/infra/certs ./infra/certs
USER app
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:22-bookworm-slim AS sefaz-mock
WORKDIR /mock
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    npm init -y >/dev/null && npm install --no-audit --no-fund tsx@^4.23.15 xml-crypto@^6.4.0 @xmldom/xmldom@^0.9.12
COPY src/lib/fiscal/assinatura.ts src/lib/fiscal/chave.ts src/lib/fiscal/certificado.ts ./src/lib/fiscal/
COPY infra/sefaz-mock ./infra/sefaz-mock
ENV SEFAZ_MOCK_PORT=8090
EXPOSE 8090
CMD ["npx", "tsx", "infra/sefaz-mock/server.ts"]
