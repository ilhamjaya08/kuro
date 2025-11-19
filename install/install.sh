#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Constants
REPO="ilhamjaya08/kuro"
BINARY_NAME="kuro"
INSTALL_DIR="/usr/local/bin"
SERVICE_NAME="kuro"

echo -e "${CYAN}"
cat << "EOF"
     /$$   /$$ /$$   /$$ /$$$$$$$   /$$$$$$
    | $$  /$$/| $$  | $$| $$__  $$ /$$__  $$
    | $$ /$$/ | $$  | $$| $$  \ $$| $$  \ $$
    | $$$$$/  | $$  | $$| $$$$$$$/| $$  | $$
    | $$  $$  | $$  | $$| $$__  $$| $$  | $$
    | $$\  $$ | $$  | $$| $$  \ $$| $$  | $$
    | $$ \  $$|  $$$$$$/| $$  | $$|  $$$$$$/
    |__/  \__/ \______/ |__/  |__/ \______/

    Background HTTP Cron Scheduler
    Installation Script
EOF
echo -e "${NC}\n"

detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    case "$OS" in
        linux*)
            OS="linux"
            ;;
        darwin*)
            OS="darwin"
            ;;
        *)
            echo -e "${RED}✗ Unsupported operating system: $OS${NC}"
            exit 1
            ;;
    esac

    case "$ARCH" in
        x86_64|amd64)
            ARCH="x64"
            ;;
        aarch64|arm64)
            ARCH="arm64"
            ;;
        *)
            echo -e "${RED}✗ Unsupported architecture: $ARCH${NC}"
            exit 1
            ;;
    esac

    PLATFORM="${OS}-${ARCH}"
    echo -e "${GREEN}✓ Detected platform: $PLATFORM${NC}"
}

check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}⚠ Not running as root. Installation will require sudo.${NC}"
        SUDO="sudo"
    else
        SUDO=""
    fi
}

download_binary() {
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/beta/kuro-${PLATFORM}"

    echo -e "${CYAN}Downloading Kuro binary...${NC}"

    TMP_DIR=$(mktemp -d)
    TMP_FILE="${TMP_DIR}/${BINARY_NAME}"

    if command -v curl &> /dev/null; then
        curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE"
    elif command -v wget &> /dev/null; then
        wget -q "$DOWNLOAD_URL" -O "$TMP_FILE"
    else
        echo -e "${RED}✗ Neither curl nor wget found. Please install one of them.${NC}"
        exit 1
    fi

    if [ ! -f "$TMP_FILE" ]; then
        echo -e "${RED}✗ Failed to download binary${NC}"
        exit 1
    fi

    chmod +x "$TMP_FILE"
    echo -e "${GREEN}✓ Binary downloaded${NC}"
}

install_binary() {
    echo -e "${CYAN}Installing Kuro to ${INSTALL_DIR}...${NC}"

    $SUDO mkdir -p "$INSTALL_DIR"
    $SUDO mv "$TMP_FILE" "${INSTALL_DIR}/${BINARY_NAME}"
    $SUDO chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

    echo -e "${GREEN}✓ Binary installed to ${INSTALL_DIR}/${BINARY_NAME}${NC}"
}

install_systemd_service() {
    if [ "$OS" != "linux" ]; then
        return
    fi

    if ! command -v systemctl &> /dev/null; then
        echo -e "${YELLOW}⚠ systemd not found. Skipping service installation.${NC}"
        return
    fi

    echo -e "${CYAN}Installing systemd service...${NC}"

    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

    $SUDO tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Kuro - Background HTTP Cron Scheduler
After=network.target

[Service]
Type=simple
ExecStart=${INSTALL_DIR}/${BINARY_NAME} --daemon
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    $SUDO systemctl daemon-reload
    $SUDO systemctl enable ${SERVICE_NAME}
    $SUDO systemctl start ${SERVICE_NAME}

    echo -e "${GREEN}✓ Systemd service installed and started${NC}"
}

install_launchd_service() {
    if [ "$OS" != "darwin" ]; then
        return
    fi

    echo -e "${CYAN}Installing launchd service...${NC}"

    PLIST_FILE="$HOME/Library/LaunchAgents/com.kuro.daemon.plist"

    mkdir -p "$HOME/Library/LaunchAgents"

    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kuro.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>${INSTALL_DIR}/${BINARY_NAME}</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/kuro.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/kuro.err</string>
</dict>
</plist>
EOF

    launchctl load "$PLIST_FILE"

    echo -e "${GREEN}✓ Launchd service installed and started${NC}"
}

verify_installation() {
    echo -e "${CYAN}Verifying installation...${NC}"

    if command -v ${BINARY_NAME} &> /dev/null; then
        echo -e "${GREEN}✓ Kuro installed successfully!${NC}"
        echo -e "\n${CYAN}Run '${BINARY_NAME}' to get started.${NC}\n"
    else
        echo -e "${RED}✗ Installation verification failed${NC}"
        exit 1
    fi
}

cleanup() {
    if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
        rm -rf "$TMP_DIR"
    fi
}

main() {
    trap cleanup EXIT

    detect_platform
    check_permissions
    download_binary
    install_binary

    if [ "$OS" = "linux" ]; then
        install_systemd_service
    elif [ "$OS" = "darwin" ]; then
        install_launchd_service
    fi

    verify_installation

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Installation complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

main "$@"
