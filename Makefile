# A little Makefile that synthetize the project related commands

NAME := prod

DOCKER_DEV := docker compose -f docker-compose.dev.yml
DOCKER_PROD := docker compose -f docker-compose.prod.yml
DB_PATH := ./database



all: ${NAME}

prod :
	${DOCKER_PROD} up --build -d


fake_users_prod:
	${DOCKER_DEV} exec matcha pnpm run script:fake_users_prod -- --num=${num}


down_prod :
	${DOCKER_PROD} down


prune : down_prod
	rm -rf build/*
	docker system prune -a --volumes -f

db-clean :
	rm -rf ${DB_PATH}/database.db
	rm -rf ${DB_PATH}/migrations.lock
	find ./profile-pictures -type f ! -name "default*" -delete

fclean : db-clean prune
