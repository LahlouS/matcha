# ft_matcha

Web dev project for 42.

## How to run:

**_note: for the moment the app is on port 3000_**

to build and run image:

```sh
make up # equivalent to: docker compose -f docker-compose.dev.yml up --build
```

to shut the container down:

```sh
make down # equivalent to: docker compose -f docker-compose.dev.yml down
```

Run the unit test:

```sh
make test # equivalent to: docker compose -f docker-compose.dev.yml exec matcha pnpm run test:unit
```

Prune your system:

```sh
make prune # equivalent to: docker system prune -a --volumes -f
```
