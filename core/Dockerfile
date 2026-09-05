FROM node
WORKDIR /prince-duals/core
COPY package.json .
COPY npm-shrinkwrap.json .
RUN npm config set maxsockets 1
RUN npm install
RUN npm audit --audit-level=high

COPY . .

RUN npm run build
