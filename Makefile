-include .env
export

# setup for docker-compose-ci build directory
# delete "build" directory to update docker-compose-ci

ifeq (,$(wildcard ./build/))
    $(shell git submodule update --init --remote)
endif

EXTENSION=SmartComments

# docker images
MW_VERSION?=1.39
PHP_VERSION?=8.1
DB_TYPE?=mysql
DB_IMAGE?=""

# extensions
SMW_VERSION?=4.1.3
MM_VERSION ?= 3.1.0

# OS packages
# libgd-dev pulls in the zlib/libpng dev headers gd's configure step needs.
# Keep this to a single package: build/Makefile's environment macro doesn't
# quote OS_PACKAGES, so a space-separated value breaks the shell command.
OS_PACKAGES?=libgd-dev

# PHP extensions
PHP_EXTENSIONS?=gd

# composer
# Enables "composer update" inside of extension
COMPOSER_EXT?=true

# nodejs
# Enables node.js related tests and "npm install"
# NODE_JS?=true

# check for build dir and git submodule init if it does not exist
include build/Makefile
