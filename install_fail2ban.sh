#!/bin/bash
set -e

echo "This script will detect the package manager and install fail2ban applying the custom configurations needed for Nginx Shield.."
read -p "Do you want to continue? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
fi

if command -v fail2ban-server &> /dev/null; then
    echo "fail2ban is already installed. Skipping installation."
else
    if command -v apt &> /dev/null; then
        echo "Detected apt (Debian/Ubuntu). Installing fail2ban..."
        sudo apt update && sudo apt install -y fail2ban
    elif command -v dnf &> /dev/null; then
        echo "Detected dnf (Fedora/CentOS/RHEL). Installing fail2ban..."
        sudo dnf install -y fail2ban
    elif command -v pacman &> /dev/null; then
        echo "Detected pacman (Arch/Manjaro). Installing fail2ban..."
        sudo pacman -Sy --noconfirm fail2ban
    else
        echo "No supported package manager found (apt, dnf, pacman)." >&2
        exit 1
    fi
fi

echo "Creating custom configuration files in /etc/fail2ban..."
sudo mkdir -p /etc/fail2ban/action.d /etc/fail2ban/filter.d /etc/fail2ban/jail.d

sudo tee /etc/fail2ban/action.d/npm.conf > /dev/null <<'EOF'
[Definition]

actionstart = iptables -N f2b-npm-docker
              iptables -A f2b-npm-docker -j RETURN
              iptables -I FORWARD 1 -p tcp -m multiport --dports 0:65535 -j f2b-npm-docker

actionstop = iptables -D FORWARD -p tcp -m multiport --dports 0:65535 -j f2b-npm-docker
             iptables -F f2b-npm-docker
             iptables -X f2b-npm-docker

actioncheck = iptables -n -L FORWARD | grep -q 'f2b-npm-docker[ \t]'

actionban = iptables -I f2b-npm-docker -s <ip> -j DROP

actionunban = iptables -D f2b-npm-docker -s <ip> -j DROP
EOF

sudo tee /etc/fail2ban/filter.d/npm-docker.conf > /dev/null <<'EOF'
[INCLUDES]

[Definition]

failregex = ^.* (9999) (9999) - .* \[Client <HOST>\] \[Length .*\] .* \[Sent-to <F-CONTAINER>.*</F-CONTAINER>\] <F-USERAGENT>".*"</F-USERAGENT> .*$

ignoreregex = ^.* (404|\-) (404) - .*".*(\.png|\.txt|\.jpg|\.ico|\.js|\.css|\.ttf|\.woff|\.woff2)(/)*?" \[Client <HOST>\] \[Length .*\] ".*" .*$
EOF

sudo tee /etc/fail2ban/jail.d/npm.local > /dev/null <<'EOF'
[npm-docker]
enabled = true
ignoreip = 127.0.0.1/8 192.168.192.0/24 172.16.0.1/12 10.0.0.0/8
action = npm
logpath = /nginx-shield/fakelogf2b.log
maxretry = 3
bantime  = 365d
findtime = 6h
filter = npm-docker
EOF

echo "Configuration completed."

echo "Creating log file directory and log file..."
sudo mkdir -p /nginx-shield
sudo touch /nginx-shield/fakelogf2b.log

echo "Restarting fail2ban to apply the new configurations..."
if sudo systemctl is-active --quiet fail2ban; then
    sudo systemctl restart fail2ban
    echo "fail2ban restarted successfully."
else
    sudo systemctl start fail2ban
    echo "fail2ban started."
fi
