FROM node:12.22.7
COPY build /bundle
WORKDIR /bundle
RUN yarn
EXPOSE 3000