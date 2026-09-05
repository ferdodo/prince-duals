FROM node
WORKDIR /prince-duals/front
COPY package.json .
COPY npm-shrinkwrap.json .
RUN npm install
RUN npm audit --audit-level=high

FROM prince-duals-core
COPY --from=0 /prince-duals/front/node_modules /prince-duals/front/node_modules

WORKDIR /prince-duals/front
COPY . .
RUN npm run build
CMD npm run start
