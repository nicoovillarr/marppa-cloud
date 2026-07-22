# Windows Development Setup (WSL2)

Run everything — Node.js, services, and Linux commands — inside WSL2. VS Code's WSL extension gives you full debugging as if developing on Linux natively.

---

## Requirements

- Windows 11 (build 22000+) or Windows 10 version 2004+
- At least 16 GB RAM
- CPU with hardware virtualization enabled in BIOS (Intel VT-x or AMD-V)
- [VS Code](https://code.visualstudio.com) with the [WSL extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl)

---

## 1. Enable WSL2

Open **PowerShell as Administrator**:

```powershell
wsl --install -d Ubuntu-24.04
wsl --set-default-version 2
```

Restart when prompted. After restart, Ubuntu finishes installing and asks for a UNIX username and password.

Verify:

```powershell
wsl --list --verbose
```

The Ubuntu entry should show `VERSION 2`.

---

## 2. Enable systemd in WSL2

Open your Ubuntu terminal:

```bash
sudo tee /etc/wsl.conf > /dev/null <<'EOF'
[boot]
systemd=true

[interop]
appendWindowsPath=false
EOF
```

Restart WSL2 from PowerShell:

```powershell
wsl --shutdown
wsl
```

Verify:

```bash
systemctl --version
```

---

## 3. Install required packages

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install -y \
  curl git build-essential \
  qemu-kvm libvirt-daemon-system libvirt-clients \
  libguestfs-tools genisoimage qemu-utils \
  virt-manager virtinst \
  dnsmasq nftables iproute2 bridge-utils \
  nmap ipcalc \
  nginx \
  redis-server \
  postgresql postgresql-contrib
```

---

## 4. Verify KVM support

```bash
kvm-ok
```

Expected:

```
INFO: /dev/kvm exists
KVM acceleration can be used
```

If not, go to Windows Features → enable **Virtual Machine Platform** and **Hyper-V**, then check BIOS virtualization settings.

---

## 5. Configure libvirt

```bash
sudo usermod -aG libvirt,kvm $USER
sudo systemctl enable --now libvirtd

sudo mkdir -p /var/lib/libvirt/images /var/lib/libvirt/cloud-init
sudo chown -R $USER:libvirt /var/lib/libvirt/images /var/lib/libvirt/cloud-init
sudo chmod 775 /var/lib/libvirt/images /var/lib/libvirt/cloud-init

sudo mkdir -p /etc/nft-backups
sudo chmod 755 /etc/nft-backups
```

---

## 6. Configure passwordless sudo

```bash
sudo tee /etc/sudoers.d/cloud-scripts > /dev/null <<EOF
$USER ALL=(ALL) NOPASSWD: \
  /usr/bin/virsh, \
  /usr/bin/virt-install, \
  /usr/bin/virt-customize, \
  /usr/bin/guestfish, \
  /usr/bin/genisoimage, \
  /usr/bin/qemu-img, \
  /usr/sbin/ip, \
  /usr/bin/networkctl, \
  /usr/sbin/iptables, \
  /usr/sbin/nft, \
  /usr/sbin/sysctl, \
  /usr/bin/systemctl, \
  /usr/sbin/nginx, \
  /usr/bin/pkill, \
  /bin/cat, \
  /bin/cp, \
  /bin/mv, \
  /bin/rm, \
  /bin/mkdir, \
  /usr/bin/install, \
  /bin/chown, \
  /bin/chmod, \
  /usr/local/sbin/reset-dnsmasq.sh
EOF

sudo chmod 440 /etc/sudoers.d/cloud-scripts
sudo visudo -c -f /etc/sudoers.d/cloud-scripts
```

Expected: `parsed OK`.

On usr-merged systems (Ubuntu 22.04+), `cat`/`cp`/`rm`/`mkdir`/`chown`/`chmod` resolve to
`/usr/bin/...`. If sudo still prompts, add the `/usr/bin/` variants too — the app runs every
privileged command through `sudo -n`, so a single missing entry blocks it. Verify with:

```bash
sudo -n true && echo "passwordless sudo OK"
```

---

## 7. Configure nftables

```bash
sudo systemctl enable --now nftables

if [ ! -f /etc/nftables.conf ]; then
  sudo tee /etc/nftables.conf > /dev/null <<'EOF'
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
  chain input {
    type filter hook input priority 0; policy accept;
  }
  chain forward {
    type filter hook forward priority 0; policy accept;
  }
  chain output {
    type filter hook output priority 0; policy accept;
  }
}

table ip nat {
  chain prerouting {
    type nat hook prerouting priority -100;
  }
  chain postrouting {
    type nat hook postrouting priority 100;
  }
}
EOF
  sudo nft -f /etc/nftables.conf
fi

cp /etc/nftables.conf ~/nftables.conf
```

Bridge netfilter (optional, only if bridged traffic is being filtered):

```bash
sudo tee /etc/sysctl.d/99-cloud-scripts-bridge.conf > /dev/null <<'EOF'
net.bridge.bridge-nf-call-iptables=0
EOF

sudo sysctl --system
```

`net.ipv4.ip_forward` is **not** configured by hand: cloud-scripts enables it at startup
(`sudo sysctl -w`) and persists it in `/etc/sysctl.d/99-cloud-scripts.conf`. That is why
`/usr/sbin/sysctl` is in the sudoers list above.

---

## 8. Configure dnsmasq

```bash
sudo systemctl disable dnsmasq
sudo systemctl stop dnsmasq
sudo mkdir -p /etc/dnsmasq.d

sudo tee /usr/local/sbin/reset-dnsmasq.sh > /dev/null <<'EOF'
#!/bin/bash
rm -f /var/lib/dnsmasq/dnsmasq.leases
rm -f /tmp/dnsmasq.leases
EOF

sudo chmod +x /usr/local/sbin/reset-dnsmasq.sh
```

Zone DHCP/DNS is written as drop-ins in `/etc/dnsmasq.d`, so the main config must include that
directory (Ubuntu ships it enabled; the startup preflight fails if it is not):

```bash
grep -q '^conf-dir=/etc/dnsmasq.d' /etc/dnsmasq.conf \
  || echo 'conf-dir=/etc/dnsmasq.d/,*.conf' | sudo tee -a /etc/dnsmasq.conf
```

---

## 8b. Enable systemd-networkd

Zone bridges are created live with `ip link` and persisted as systemd-networkd units in
`/etc/systemd/network` (`10-z-xxxxxx.netdev` + `.network`). `ifupdown` is **not** used: it is
absent on modern Ubuntu, and restarting `networking` would drop the host uplink.

```bash
sudo systemctl enable --now systemd-networkd
sudo mkdir -p /etc/systemd/network
```

---

## 9. Configure Redis

```bash
sudo systemctl enable --now redis-server
redis-cli ping
# Expected: PONG
```

---

## 10. Configure PostgreSQL

```bash
sudo systemctl enable --now postgresql

sudo -u postgres psql <<'EOF'
CREATE USER marppa WITH PASSWORD 'marppa';
CREATE DATABASE marppa_cloud OWNER marppa;
GRANT ALL PRIVILEGES ON DATABASE marppa_cloud TO marppa;
EOF
```

---

## 11. Install Node.js inside WSL2

Install Node.js **inside WSL2** (not on Windows):

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

---

## 12. Open the project in VS Code via WSL

From your Ubuntu terminal, navigate to the repo and open VS Code:

```bash
cd /mnt/d/dev/repos/marppa/marppa-cloud   # adjust to your Windows path
code .
```

VS Code opens with the WSL extension active. All terminals, debugging, and file operations run inside WSL2.

---

## 13. Configure the app environment

Inside the WSL2 terminal in VS Code, copy the template:

```bash
cd apps/cloud-scripts
cp .env.template .env.development.local
```

Edit `.env.development.local`.

---

## 14. Install dependencies and generate Prisma client

From the repo root inside WSL2:

```bash
npm install
cd apps/cloud-scripts
npx prisma generate
npx prisma migrate deploy
```

---

## 15. Start WSL2 services

Every new session, start the required services:

```bash
sudo systemctl start redis-server postgresql libvirtd nftables
```

---

## 16. Run the app

```bash
# Single run
npm run dev

# Auto-reload on file change
npm run dev:watch
```

---

## 17. Debugging with VS Code

Press **F5** in VS Code. The **dev** launch configuration runs `ts-node` with full breakpoint support inside WSL2.

Alternatively, run with the inspector and attach:

```bash
node --inspect -r ts-node/register/transpile-only src/index.ts
```

Then use the **attach (remote)** configuration in VS Code (`F5` → select "attach (remote)").

---

## Troubleshooting

### `kvm-ok` says KVM cannot be used

1. Confirm virtualization is enabled in BIOS.
2. Enable **Virtual Machine Platform** in Windows Features.
3. Run in PowerShell as Administrator:
   ```powershell
   bcdedit /set hypervisorlaunchtype auto
   ```
4. Restart Windows.

### `sudo` asks for a password during app execution

The sudoers file in step 6 must cover every binary the app calls. Check the exact binary path from the error and add it to `/etc/sudoers.d/cloud-scripts`.

### Networking features (bridges, nftables) don't work as expected

WSL2 runs inside a Hyper-V VM with a virtual NIC — bridge networking and nftables operate within WSL2's network namespace and cannot control the Windows host network. This is expected: `cloud-scripts` is designed for a dedicated Linux server in production. WSL2 mode is for testing application logic and VM lifecycle.
