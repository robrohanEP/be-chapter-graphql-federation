FROM gcr.io/distroless/static

ADD bramble /bramble
ADD config.json /config.json

EXPOSE 8082
EXPOSE 8083
EXPOSE 8084

CMD [ "/bramble", "-conf", "/config.json" ]
