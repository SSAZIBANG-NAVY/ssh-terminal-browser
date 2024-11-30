# ssh-terminal-browser

This browser-based SSH client provides almost the same functionality as traditional SSH programs.

The project mainly implement web-based SSH clients, allowing users to access and manage remote servers through web browsers. This allows users to access and work on servers with just a browser, without having to install or configure separate SSH clients.

Also,

- Firewall bypass: If SSH connections are required from an enterprise internal network or behind a firewall, this browser-based client allows access without installing an external SSH client.
- Protocol compatibility: A typical SSH client can be accessed using a web-based client even in a blocked environment.

**SSL/TLS must be applied before deploying this browser-based SSH client in a production environment.**

`host`, `port`, `user`, `passowrd` are required for SSH connection.

`SSH key authentication` is not supported.

## Preview

### Before connection
![](https://github.com/user-attachments/assets/0dcf99e3-4db0-4361-bd2f-69fefb6d9ada)

### After connection
![](https://github.com/user-attachments/assets/021296c9-8545-499c-b5e1-bab25c509ca9)
