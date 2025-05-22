MAKEFLAGS += -s

CURRENT_DATE	:= $(shell date +"%Y-%m-%d %H:%M:%S")

DEF_COLOR = \033[0;39m
GRAY = \033[0;90m
RED = \033[0;91m
GREEN = \033[0;92m
YELLOW = \033[0;93m
BLUE = \033[0;94m
MAGENTA = \033[0;95m
CYAN = \033[0;96m
WHITE = \033[0;97m

RM	= @rm -rf

all :
	@if ! grep -q "127.0.0.1 transcendence" /etc/hosts; then \
		echo >> /etc/hosts "127.0.0.1 transcendence"; \
	fi
	export DOCKER_ROOT=/goinfre/$(whoami)/docker-root
	mkdir -p Backend/monitoring/Grafana/certs
	mkdir -p Backend/monitoring/Prometheus/certs
	mkdir -p Backend/monitoring/nginx-exporter/certs
	@./generate_certs_prome.sh > /dev/null 2>&1
	@chmod -R 755 ./Backend/monitoring/Prometheus/certs
	docker-compose down
	docker-compose up

build :
	@if ! grep -q "127.0.0.1 transcendence" /etc/hosts; then \
		echo >> /etc/hosts "127.0.0.1 transcendence"; \
	fi
	export DOCKER_ROOT=/goinfre/$(whoami)/docker-root
	mkdir -p Backend/monitoring/Grafana/certs
	mkdir -p Backend/monitoring/Prometheus/certs
	mkdir -p Backend/monitoring/nginx-exporter/certs
	@./generate_certs_prome.sh > /dev/null 2>&1
	@chmod -R 755 ./Backend/monitoring/Prometheus/certs
	docker-compose down
	docker-compose build
	docker-compose up

clean :
	docker-compose down

fclean :
	docker-compose down --volumes --remove-orphans

hardclean:
	@if [ -n "$$(docker ps -aq)" ]; then docker rm -f $$(docker ps -aq); fi
	@if [ -n "$$(docker images -aq)" ]; then docker rmi -f $$(docker images -aq); fi
	docker-compose down --volumes --remove-orphans

git	: fclean
	@git add . > /dev/null 2>&1
	@@msg=$${MSG:-"$(CURRENT_DATE)"}; git commit -m "$(USER) $(CURRENT_DATE) $$msg" > /dev/null 2>&1
	@git push > /dev/null 2>&1
	@echo "$(GREEN)(•̀ᴗ•́)و ̑̑GIT UPDATE!(•̀ᴗ•́)و ̑̑$(DEF_COLOR)"
