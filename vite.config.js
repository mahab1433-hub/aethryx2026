export default {
  server: {
    // Allows the dev server to be accessed from any network IP
    host: true, 
    // Allowing all hosts to ensure the tunnel always works
    allowedHosts: true,
    hmr: {
      clientPort: 443
    }
  }
}
