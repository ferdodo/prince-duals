FROM prince-duals-ws-client
FROM prince-duals-player
FROM prince-duals-game
FROM prince-duals-character
FROM prince-duals-ws-server
FROM prince-duals-config

FROM node
COPY --from=0 /prince-duals/lib/ws-client /prince-duals/lib/ws-client
COPY --from=1 /prince-duals/domains/player /prince-duals/domains/player
COPY --from=2 /prince-duals/models/game /prince-duals/models/game
COPY --from=3 /prince-duals/models/character /prince-duals/models/character
COPY --from=4 /prince-duals/lib/ws-server /prince-duals/lib/ws-server
COPY --from=5 /prince-duals/lib/config /prince-duals/lib/config

WORKDIR /prince-duals/frontend
COPY package.json .
COPY npm-shrinkwrap.json .
RUN npm install
RUN npm audit --audit-level=critical

COPY . .
RUN npm run build

FROM nginx
COPY --from=6 /prince-duals/frontend/dist /usr/share/nginx/html