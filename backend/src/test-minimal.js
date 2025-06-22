const express = require('express');
const app = express();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', message: 'Minimal server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Minimal test server running on port ${PORT}`);
});
