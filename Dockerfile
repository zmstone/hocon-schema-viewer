FROM node:19.8.1
ADD . /hsv
WORKDIR /hsv
RUN npm install
CMD [ "/hsv/build" ]
