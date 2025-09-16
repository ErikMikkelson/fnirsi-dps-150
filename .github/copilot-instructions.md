# FNIRSI-DPS-150 Web Interface AI Agent Instructions

This document provides guidance for AI agents working on this codebase.

## About the Project

This is a web-based interface for the FNIRSI DPS-150 programmable power supply. It uses the Web Serial API to communicate with the device directly from the browser. The frontend is built with Vue.js, Vuetify, and Pinia for state management.

## Architecture

The application has a decoupled architecture that separates the UI from the device communication logic.

-   **Main Thread (UI):** The user interface is a standard Vue.js application.
    -   Components are located in `src/components/`.
    -   The main application component is `src/App.vue`.
    -   State is managed by Pinia, with the main store for the device in `src/store/device.ts`.
-   **Web Worker (Device Communication):** All communication with the power supply happens in a separate Web Worker to avoid blocking the UI.
    -   The worker entry point is `src/core/worker.ts`.
    -   The core logic for the FNIRSI DPS-150 communication protocol is implemented in `src/core/dps-150.ts`.
-   **UI-Worker Communication:** The main thread and the web worker communicate using `Comlink`. This allows the UI to call functions in the worker as if they were local promises.

## Key Files

-   `src/core/dps-150.ts`: Contains the low-level implementation of the communication protocol for the power supply. This is where commands are constructed and responses are parsed.
-   `src/core/worker.ts`: Sets up the Web Worker and exposes the `DPS150` class methods via `Comlink`.
-   `src/store/device.ts`: The Pinia store that holds the state of the power supply (e.g., voltage, current, protection status) and provides actions to interact with the device via the worker.
-   `src/App.vue`: The main Vue component that orchestrates the UI and calls actions on the Pinia store.
-   `package.json`: Defines project scripts and dependencies.
-   `vite.config.ts`: Configuration for the Vite build tool.

## Development Workflow

The project uses `yarn` as the package manager and `vite` for development and builds.

-   **To install dependencies:**
    ```bash
    yarn install
    ```
-   **To run the development server:**
    ```bash
    yarn dev
    ```
-   **To run tests:**
    ```bash
    yarn test
    ```
-   **To build for production:**
    ```bash
    yarn build
    ```

## Communication Protocol

The application communicates with the device over serial using a custom binary protocol.

-   The protocol is defined in `src/core/dps-150.ts`.
-   Commands are sent as byte arrays. See the `getValue`, `setValue`, and other methods in `DPS150` class for examples.
-   The `DPS150` class handles constructing command packets and parsing response packets. When making changes to device communication, this is the primary file to edit.
