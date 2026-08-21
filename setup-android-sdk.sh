#!/usr/bin/env bash

set -e

echo "=== 1. Updating packages and installing dependencies ==="
sudo apt update
sudo apt install -y openjdk-17-jdk wget unzip

echo "=== 2. Creating Android SDK directory structure ==="
mkdir -p "$HOME/Android/Sdk/cmdline-tools"

echo "=== 3. Downloading Android Command-Line Tools ==="
CDT_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
TMP_ZIP="/tmp/cmdline-tools.zip"

wget -q --show-progress "$CDT_URL" -O "$TMP_ZIP"

echo "=== 4. Extracting Command-Line Tools ==="
TMP_DIR=$(mktemp -d)
unzip -q "$TMP_ZIP" -d "$TMP_DIR"

mkdir -p "$HOME/Android/Sdk/cmdline-tools/latest"
rm -rf "$HOME/Android/Sdk/cmdline-tools/latest/"*
mv "$TMP_DIR"/cmdline-tools/* "$HOME/Android/Sdk/cmdline-tools/latest/"

rm -rf "$TMP_DIR" "$TMP_ZIP"

echo "=== 5. Setting up Environment Variables ==="
EXPORT_BLOCK='
# Android SDK Config
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0
'

# Detect shell configuration file
SHELL_CONFIG="$HOME/.bashrc"
if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
fi

if ! grep -q "ANDROID_HOME" "$SHELL_CONFIG"; then
    echo "$EXPORT_BLOCK" >> "$SHELL_CONFIG"
    echo "Added environment variables to $SHELL_CONFIG"
else
    echo "Environment variables already exist in $SHELL_CONFIG"
fi

export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/build-tools/34.0.0"

echo "=== 6. Installing SDK Packages & Accepting Licenses ==="
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platform-tools" "build-tools;34.0.0" "platforms;android-34"
yes | sdkmanager --licenses > /dev/null 2>&1 || true

echo ""
echo "=========================================================="
echo " Android SDK installation completed successfully!"
echo " Please run: source $SHELL_CONFIG"
echo "=========================================================="
