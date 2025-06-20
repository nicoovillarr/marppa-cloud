# Marppa Cloud Solution

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

This repository contains the code for the Marppa Cloud Solution, which is designed to provide a scalable and efficient cloud-based platform for managing and deploying applications. It contains the fullstack code and server scripts necessary to run the Marppa Cloud Solution.

## Hive

The Hive is a core module of the MCS that provides virtualization for running applications. It is designed to be lightweight and efficient, allowing for quick deployment and management of VMs. Within the Hive, users can create, manage, and scale Workers (VMs) as needed, providing a flexible environment for application development and deployment.

### Workers

Workers are the virtual machines that run within the Hive. They can be created, managed, and scaled according to the needs of the applications being deployed. The Hive provides a user-friendly interface for managing these Workers, allowing users to easily monitor their performance and make adjustments as necessary.

The host machine creates Workers by running the `create_worker.sh` script, which sets up the necessary environment and configurations for each Worker. This script is designed to be run on the host machine, and it will create a new Worker VM with the specified parameters.

## Nibble

Nibble is a lightweight, efficient, and secure containerization solution designed to run applications within the Marppa Cloud Solution. It provides a streamlined environment for deploying and managing docker applications.

### Bits

Bits are the individual containers that run within Nibble. Each Bit is a self-contained unit that can run a specific application or service. Bits are designed to be lightweight and efficient, allowing for quick deployment and scaling of applications.

Bits can be easily managed and monitored through the Nibble interface, providing users with the tools they need to ensure their applications are running smoothly.

## Mesh

The Mesh is another core module of the MCS that provides a network layer for communication between Workers and other components of the system. It ensures that all Workers can communicate with each other and with the Hive, enabling seamless operation of applications across the cloud platform.

### Zones

Zones are logical groupings of Workers within the Mesh. They allow for better organization and management of Workers, enabling users to group them based on specific criteria such as geographical location, application type, or resource requirements. Each Zone can have its own set of configurations and policies, allowing for tailored management of the Workers within that Zone.

Zones help in optimizing resource allocation and improving the performance of applications by ensuring that Workers are grouped in a way that minimizes latency and maximizes efficiency.

### Nodes

Nodes are the IP addresses within a Zone that are used to identify and communicate with Workers. Each Worker is assigned a unique Node IP address, which allows it to be accessed and managed within the Mesh. The Nodes are essential for ensuring that all Workers can communicate effectively, enabling the distributed nature of the Marppa Cloud Solution.

Each Node is meant to be secure and isolated, ensuring that communication between Workers is efficient and reliable. The Mesh provides the necessary infrastructure to manage these Nodes, allowing for easy scaling and management of the cloud environment.

### Fibers

Fibers are the relationships between Nodes, Workers and Bits within the Mesh. They enable communication and data transfer between different components of the system, ensuring that all parts of the Marppa Cloud Solution can work together seamlessly.