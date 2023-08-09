# clyde-api
Interact with Discord's AI robot friend, Clyde!

This Node.js program serves as a Discord bot client that connects to the Discord Gateway using WebSocket and interacts with the Discord API. It also includes an HTTP server that offers endpoints for managing messages in a specific Discord channel.

## Features

- Real-time interaction with the Discord Gateway through WebSocket.
- Handling of gateway events like identification, session resumption, and heartbeating.
- Storage and management of messages sent by a specific user (Clyde) referencing a specific bot in the specified channel.
- HTTP server providing endpoints for sending, retrieving, and removing messages.

## Getting Started

1. Clone this repository to your local machine.

2. Install the required dependencies using npm:

   ```
   npm install
   ```

3. Create a `.env` file in the project root and set the following environment variables:

   ```
   TOKEN=<Your Discord Bot Token>
   CHANNELID=<Target Discord Channel ID>
   CLYDEID=<Clyde User ID>
   BOTID=<Your Bot's ID>
   ```

   Replace the placeholders with your actual values.

4. Run the program using Node.js:

   ```
   node index.js
   ```

5. The WebSocket client will connect to the Discord Gateway, and the HTTP server will start on port 3000.

## Usage

### WebSocket Client

The WebSocket client establishes a connection to the Discord Gateway and manages various gateway events, including heartbeating and session identification. It listens for specific messages from Clyde in the specified channel and stores them for further management.

### HTTP Endpoints

The HTTP server provides the following endpoints for managing messages:

- `GET /get-messages`: Retrieve stored messages in the specified Discord channel.

- `POST /send-message`: Send a message to the Discord channel. Send a JSON payload in the request body with the following structure:

  ```json
  {
    "message": "Your message content here"
  }
  ```

- `DELETE /remove-message`: Remove a stored message by its ID. Send a JSON payload in the request body with the following structure:

  ```json
  {
    "id": "Message ID to remove"
  }
  ```

## Important Notes

- Ensure you have a valid Discord bot token and necessary permissions for the specified channel.
- This program is a simplified example and may require enhancements for production use.
- Handle sensitive information, such as tokens, with care and follow security best practices.

## License

This project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details.
