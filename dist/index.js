import { createApp } from './app.js';
const app = createApp();
const PORT = process.env.PORT || 7646;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
