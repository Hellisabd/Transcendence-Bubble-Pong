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
	export DOCKER_ROOT=/goinfre/$(whoami)/docker-root
	docker-compose build
	docker-compose up

clean :
	docker-compose down --volumes --remove-orphans

git	:
	@git add . > /dev/null 2>&1
	@@msg=$${MSG:-"$(CURRENT_DATE)"}; git commit -m "$(USER) $(CURRENT_DATE) $$msg" > /dev/null 2>&1 
	@git push > /dev/null 2>&1
	@echo "$(GREEN)(•̀ᴗ•́)و ̑̑GIT UPDATE!(•̀ᴗ•́)و ̑̑$(DEF_COLOR)"f