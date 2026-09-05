FROM node
WORKDIR /prince-duals/backend
COPY package.json .
COPY npm-shrinkwrap.json .
RUN npm install
RUN npm audit --audit-level=high

FROM prince-duals-core
COPY --from=0 /prince-duals/backend/node_modules /prince-duals/backend/node_modules

WORKDIR /prince-duals/backend
COPY . .
RUN npm run build
CMD node dist/main.js
