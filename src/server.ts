import app from './app';
import { PORT } from './lib/constants';
import { startSystemScheduler } from './scheduler/systemScheduler';

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startSystemScheduler();
});
