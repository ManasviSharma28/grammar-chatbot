# =============================================================================
# React Native (Expo) Project Makefile — SINGLE-FLAVOR TEMPLATE
# =============================================================================
#
# This template is for projects with ONE app variant (no dev/staging/prod).
# Copy to your repo root as `Makefile` and align package.json scripts +
# eas.json profile names (development, preview, production) with the targets
# below.
#
# Usage: make <command>
# Run `make` or `make help` to see all available commands grouped by category.
#
# Quick Start:
#   make install              - Install dependencies
#   make start                - Start Metro
#   make run-ios              - Build + run on iOS simulator
#   make run-android          - Build + run on Android emulator
#   make eas-build            - Cloud build via EAS (development profile)
#
# =============================================================================

.PHONY: help \
        install reinstall pod clean nuke clean-cache disk-usage \
        icons splash \
        start \
        run-ios run-ios-device run-android \
        build-ios build-android-apk \
        prebuild \
        lint lint-fix format format-check typecheck test test-watch \
        eas-login eas-whoami eas-init eas-configure \
        eas-build eas-build-preview eas-build-store \
        eas-update eas-submit-ios eas-submit-android \
        kill-metro adb-reverse devices doctor logs-android logs-ios mirror

# Default target
.DEFAULT_GOAL := help

# Prefer rbenv-managed ruby for CocoaPods. Avoids picking up a broken
# system/RVM ruby (commonly seen after Homebrew prunes openssl/strscan
# extensions during prebuild). If rbenv isn't installed the entry is a
# no-op — PATH lookup just skips a non-existent dir.
export PATH := $(HOME)/.rbenv/shims:$(PATH)

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

# =============================================================================
# HELP
# =============================================================================

help: ## Show all available commands
	@echo ""
	@echo "================================================================"
	@echo "  $(GREEN)React Native (Expo)$(RESET) - single-flavor Makefile"
	@echo "================================================================"
	@echo ""
	@echo "  $(YELLOW)SETUP$(RESET)"
	@grep -E '^(install|reinstall|pod|clean|nuke|clean-cache|disk-usage):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(YELLOW)ASSETS$(RESET)"
	@grep -E '^(icons|splash):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(YELLOW)RUN (local sim/emulator + Metro)$(RESET)"
	@grep -E '^(start|run-ios|run-ios-device|run-android):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(YELLOW)BUILD (local artifacts — IPA/APK)$(RESET)"
	@grep -E '^(build-ios|build-android-apk):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(YELLOW)PREBUILD (regenerate native folders)$(RESET)"
	@grep -E '^prebuild:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(YELLOW)EAS (cloud build)$(RESET)"
	@grep -E '^eas-[a-z\-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(YELLOW)QUALITY$(RESET)"
	@grep -E '^(lint|lint-fix|format|format-check|typecheck|test|test-watch):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "  $(YELLOW)UTILITIES$(RESET)"
	@grep -E '^(kill-metro|adb-reverse|devices|doctor|logs-android|logs-ios|mirror):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# SETUP
# =============================================================================

install: ## Install node dependencies (yarn)
	yarn install

reinstall: ## Remove node_modules + lockfiles and reinstall fresh
	rm -rf node_modules package-lock.json
	yarn install

pod: ## Install iOS CocoaPods via bundle exec (pins to Gemfile.lock — cocoapods 1.14.3)
	cd ios && bundle exec pod install

clean: ## Clean RN cache + native build dirs (frees ~500MB)
	npx react-native clean || true
	rm -rf android/app/.cxx android/app/build android/.gradle android/build
	rm -rf ios/build ios/Pods/build
	rm -rf .expo
	@echo "$(GREEN)Cleaned.$(RESET) node_modules + Pods preserved (use 'make nuke' for full reset)."

nuke: ## Full reset (node_modules, native builds, caches, Metro, watchman)
	@echo "$(YELLOW)Cleaning everything...$(RESET)"
	rm -rf node_modules
	rm -rf android/build android/app/build android/.gradle android/app/.cxx
	rm -rf ios/build ios/Pods
	rm -rf .expo
	watchman watch-del-all 2>/dev/null || true
	yarn cache clean 2>/dev/null || true
	@echo "$(GREEN)Done!$(RESET) Run 'make install && make pod' to reinstall."

disk-usage: ## Report the biggest dev caches + node_modules eating disk space
	@echo "$(CYAN)Biggest dev caches:$(RESET)"
	-@du -sh ~/Library/Developer/CoreSimulator ~/Library/Developer/Xcode/DerivedData ~/.gradle ~/.cocoapods ~/.npm ~/.pub-cache 2>/dev/null | sort -rh
	@echo "$(CYAN)node_modules under ~/Documents:$(RESET)"
	-@find ~/Documents -maxdepth 5 -type d -name node_modules -prune 2>/dev/null | while read n; do du -sh "$$n" 2>/dev/null; done | sort -rh | head -10
	@df -h / | tail -1 | awk '{print "  Free: " $$4 " of " $$2}'

# Global dev caches that regrow endlessly (gradle alone hit 46G once and filled
# the disk mid-build). All regenerate — the next native build re-downloads them.
# This does NOT touch node_modules or this project's build (use clean/nuke for that).
clean-cache: ## Free disk space — clear global dev caches (Xcode/Gradle/Pods/sims/npm/yarn)
	@echo "$(YELLOW)Freeing global dev caches (project builds untouched)...$(RESET)"
	-rm -rf ~/Library/Developer/Xcode/DerivedData/*
	-rm -rf ~/.gradle/caches ~/.gradle/daemon
	-rm -rf ~/Library/Caches/CocoaPods
	-rm -rf "$$HOME/Library/Developer/CoreSimulator/Caches"
	-xcrun simctl delete unavailable 2>/dev/null || true
	-yarn cache clean 2>/dev/null || true
	-npm cache clean --force 2>/dev/null || true
	-watchman watch-del-all 2>/dev/null || true
	@echo "$(GREEN)Done.$(RESET) Run 'make disk-usage' to check free space. First native build re-downloads gradle/pods (one-time)."

# =============================================================================
# ASSETS
# =============================================================================

icons: ## Generate app icons from assets/app_icon.{png,jpg,jpeg}
	@bash scripts/generate-icons.sh

splash: ## Generate splash screen from assets/app_splash.{png,jpg,jpeg}
	@bash scripts/generate-splash.sh

# =============================================================================
# RUN (Metro bundler)
# =============================================================================

start: ## Start Metro bundler
	yarn start

# =============================================================================
# RUN (build dev-client + install on sim/device + start Metro)
# =============================================================================

run-ios: ## Build + run on iOS simulator
	yarn run:ios

run-ios-device: ## Build + install + launch on a PHYSICAL iPhone (use instead of run-ios — @expo/cli's device installer is broken)
	./scripts/run-ios-device.sh

run-android: ## Build + run on Android emulator/device
	yarn run:android --device

# =============================================================================
# BUILD (local artifacts — release configuration, no install, no Metro)
# =============================================================================

build-ios: ## Local iOS Release build (no install)
	yarn build:ios

build-android-apk: ## Local Android Release APK
	npx expo prebuild --platform android
	cd android && ./gradlew app:assembleRelease -x lint -x test --build-cache
	@echo "$(GREEN)APK:$(RESET) android/app/build/outputs/apk/release/app-release.apk"

# =============================================================================
# PREBUILD (regenerate native ios/ + android/ folders)
# =============================================================================

prebuild: ## Regenerate native folders (clean)
	yarn prebuild
	# Optional: npx instrumentDynatrace  — uncomment if your project uses Dynatrace

# =============================================================================
# EAS (cloud build + update + submit)
# =============================================================================

# eas-cli is intentionally NOT a project dependency — its nested @expo/* packages
# break `expo config --json` on a fresh CI install. Run it on-demand via npx so it
# lands in the npx cache (not node_modules). `--yes` keeps CI non-interactive; the
# version is enforced by eas.json `cli.version`.
#
# Profile names below (development, preview, production) must match your eas.json.
EAS := npx --yes --package eas-cli eas
PLATFORM ?= all

eas-login: ## Login to your Expo account (one-time)
	$(EAS) login

eas-whoami: ## Show current logged-in Expo user
	$(EAS) whoami

eas-init: ## Link this project to an EAS project ID (run once)
	$(EAS) init

eas-configure: ## Set up eas.json build profiles (interactive)
	$(EAS) build:configure

eas-build: ## EAS cloud build — development distribution (dev-client)
	$(EAS) build --profile development --platform all

eas-build-preview: ## EAS release build — standalone (no dev-client / no Metro; internal APK/ad-hoc IPA)
	$(EAS) build --profile preview --platform $(PLATFORM)

eas-build-store: ## EAS store build — production (TestFlight / Play Store-ready, autoIncrement)
	$(EAS) build --profile production --platform $(PLATFORM)

eas-update: ## Push OTA JS update (no native rebuild needed)
	$(EAS) update --auto

eas-submit-ios: ## Submit latest iOS build to App Store Connect / TestFlight
	$(EAS) submit --platform ios --latest

eas-submit-android: ## Submit latest Android build to Play Console
	$(EAS) submit --platform android --latest

# =============================================================================
# QUALITY
# =============================================================================

lint: ## Run ESLint
	npx eslint . --ext .js,.jsx,.ts,.tsx

lint-fix: ## Run ESLint + auto-fix
	npx eslint . --ext .js,.jsx,.ts,.tsx --fix

format: ## Format src/ with Prettier
	npx prettier --write 'src/**/*.{ts,tsx,js,jsx,json}'

format-check: ## Check formatting (no writes) — useful in CI
	npx prettier --check 'src/**/*.{ts,tsx,js,jsx,json}'

typecheck: ## TypeScript type check (no emit)
	npx tsc --noEmit

test: ## Run Jest tests
	npx jest --forceExit

test-watch: ## Run Jest in watch mode
	npx jest --watch

# =============================================================================
# UTILITIES
# =============================================================================

kill-metro: ## Kill Metro bundler process (free port 8081)
	@lsof -ti:8081 | xargs kill -9 2>/dev/null && echo "$(GREEN)Metro killed$(RESET) (port 8081 freed)" || echo "$(YELLOW)Nothing running on 8081$(RESET)"

adb-reverse: ## Setup ADB reverse port (Android device debug)
	adb reverse tcp:8081 tcp:8081

devices: ## List connected Android devices
	adb devices

doctor: ## Run Expo doctor (checks env health)
	npx expo-doctor

logs-android: ## Tail Android logs (logcat filtered to RN)
	npx react-native log-android

logs-ios: ## Tail iOS simulator logs
	npx react-native log-ios

mirror: ## Mirror connected Android device via scrcpy
	@echo "$(YELLOW)Mirroring device...$(RESET)"
	scrcpy --max-size=1024 --window-title="React Native App"
