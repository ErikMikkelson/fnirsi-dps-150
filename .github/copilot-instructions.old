# FNIRSI DPS-150 Web Interface AI Agent Instructions

This document provides guidance for AI coding agents working on the FNIRSI DPS-150 web interface project.

## Architecture Overview

The project is a web-based interface for the FNIRSI DPS-150 power supply, utilizing the WebSerial API. The architecture separates concerns into three main parts:

1.  **Frontend (`script.js`):** A Vue.js application that provides the user interface. It communicates with the background worker using [Comlink](httpshttps://github.com/GoogleChromeLabs/comlink). All user interactions and data visualization happen here.
2.  **Background Worker (`worker.js`):** A Web Worker that runs the device communication logic in the background to keep the UI responsive. It receives commands from the frontend, interacts with the `DPS150` class, and sends data back.
3.  **Protocol and Device Logic (`dps-150.js`):** This is the core of the project. It contains the `DPS150` class which implements the custom binary protocol for communicating with the power supply via the WebSerial API. It handles command creation, sending, and parsing of responses.

The data flow is as follows:
`UI (script.js)` -> `Comlink` -> `Worker (worker.js)` -> `DPS150 Class (dps-150.js)` -> `WebSerial API` -> `Device`

## Modernization Roadmap (2025 Best Practices)

To align with modern web development standards, the following refactoring efforts are encouraged:

1.  **TypeScript Migration:** The entire codebase (`script.js`, `worker.js`, `dps-150.js`) should be migrated to TypeScript. This will improve code quality, maintainability, and type safety, which is crucial for the binary protocol implementation.
2.  **Vite-Powered Frontend:** The project should be restructured to use Vite (already in `devDependencies`) for the frontend build process. This involves:
    *   Creating a proper `src` directory for frontend code.
    *   Refactoring the monolithic `script.js` into Vue Single File Components (SFCs) for better organization.
    *   Managing dependencies like Vue, Comlink, and Vuetify via `package.json` instead of CDNs.
3.  **State Management:** For better state management in the Vue application, consider introducing Pinia. This will help manage the complex device state more effectively than the current plain data object.

## Development Workflow

### Running the Application

Once migrated to Vite, the development server should be run via `npm`:

```bash
# Install dependencies
npm install

# Run the Vite development server
npm run dev
```

The application must be opened in a browser that supports the WebSerial API, such as Google Chrome.

### Testing

The project uses [Vitest](https://vitest.dev/) for testing. Tests are separated for Node.js and browser environments.

-   **Run all tests:**
    ```bash
    npm test
    ```
-   **Run only Node.js tests:**
    ```bash
    npm run test:node
    ```
-   **Run only browser tests (using Playwright):**
    ```bash
    npm run test:browser
    ```

The browser tests are located in `tests/**/*.browser.test.js` and node tests in `tests/**/*.test.js`. Mocks for the WebSerial API can be found in `tests/mocks/webSerial.js`.

## Code Conventions

### Serial Communication Protocol

The communication with the DPS-150 is via a custom binary protocol. The implementation is in `dps-150.js`.

-   **Packet Structure:** Commands and responses have a specific structure: `[header, command, type, length, ...data, checksum]`.
-   **Command/Type Constants:** All protocol-specific constants (commands, types, etc.) are defined as exported constants at the top of `dps-150.js`. When adding or modifying commands, refer to these constants.
-   **Checksum:** The checksum is a simple modulo 256 sum of the bytes from `type` to the end of the data.

### Frontend and Worker Communication

-   The frontend (`script.js`) and the worker (`worker.js`) communicate using Comlink.
-   The worker exposes a `Backend` object that the frontend can call methods on asynchronously.
-   When adding features that require device interaction, you will likely need to:
    1.  Add a method to the `DPS150` class in `dps-150.js`.
    2.  Expose this functionality through the `Backend` in `worker.js`.
    3.  Call the new method from the Vue component in `script.js`.

## Key Files

-   `index.html`: The main HTML file and UI structure.
-   `script.js`: Frontend logic, Vue components, and UI state management. (To be refactored into SFCs)
-   `dps-150.js`: The core `DPS150` class and protocol implementation.
-   `worker.js`: The Web Worker that bridges the UI and the device logic.
-   `vitest.config.js`: Configuration for the test suites.
-   `tests/`: Contains all tests. Pay attention to the `.browser.test.js` suffix for browser-specific tests.
